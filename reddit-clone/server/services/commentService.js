const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const cache = require('../config/redis');
const { wilsonScore } = require('../utils/ranking');
const { AppError } = require('../utils/appError');
const { analyseToxicity } = require('./aiService');
const logger = require('../utils/logger');

/**
 * Fetches all comments for a post and assembles them into a nested tree.
 * Sorted by Wilson score (best comments float up).
 */
const getComments = async (postId) => {
  const cacheKey = `comments:${postId}`;

  return cache.getOrSet(
    cacheKey,
    async () => {
      const comments = await Comment.find({ post: postId, isDeleted: false })
        .populate('author', 'username karma avatar')
        .sort({ wilsonScore: -1, createdAt: 1 })
        .lean();

      return buildCommentTree(comments);
    },
    30 // 30s — comments change frequently
  );
};

/**
 * Builds a nested comment tree from a flat array.
 * O(n) — single pass using a map.
 */
const buildCommentTree = (comments) => {
  const map = {};
  const roots = [];

  // First pass: index all comments
  comments.forEach((c) => {
    map[c._id.toString()] = { ...c, children: [] };
  });

  // Second pass: attach children to parents
  comments.forEach((c) => {
    const parentId = c.parent?.toString();
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[c._id.toString()]);
    } else {
      roots.push(map[c._id.toString()]);
    }
  });

  return roots;
};

/**
 * Creates a comment or reply with:
 * - AI toxicity check (non-blocking — logs and flags but doesn't block)
 * - Cache invalidation for the post's comment tree
 * - Notification to post author (via socket, called in controller)
 */
const createComment = async ({ body, postId, parentId, userId }) => {
  const post = await Post.findById(postId).select('author commentCount').lean();
  if (!post) throw new AppError('Post not found', 404);

  // AI toxicity detection — async, non-blocking for UX
  let toxicityResult = { toxic: false, score: 0, categories: [], reason: '' };
  try {
    toxicityResult = await analyseToxicity(body);
  } catch (err) {
    logger.warn('Toxicity check failed, allowing comment:', err.message);
  }

  // Hard block for high-confidence toxic content (score > 0.9)
  if (toxicityResult.toxic && toxicityResult.score > 0.9) {
    throw new AppError(
      'Your comment was flagged by our automated moderation system. Please review our community guidelines.',
      422
    );
  }

  let depth = 0;
  if (parentId) {
    const parent = await Comment.findById(parentId).select('depth').lean();
    if (!parent) throw new AppError('Parent comment not found', 404);
    depth = Math.min(parent.depth + 1, 10); // cap nesting at 10 levels
    await Comment.findByIdAndUpdate(parentId, { $push: { children: null } }); // placeholder updated below
  }

  const ups = 1;
  const downs = 0;
  const wilson = wilsonScore(ups, downs);

  const comment = await Comment.create({
    body: body.trim(),
    author: userId,
    post: postId,
    parent: parentId || null,
    upvotes: [userId],
    score: 1,
    wilsonScore: wilson,
    depth,
    isFlagged: toxicityResult.toxic && toxicityResult.score > 0.5,
    toxicityScore: toxicityResult.score,
  });

  // Atomically increment post comment count
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  // Invalidate comment cache
  await cache.del(`comments:${postId}`);

  const populated = await Comment.findById(comment._id)
    .populate('author', 'username karma avatar')
    .lean();

  return {
    comment: { ...populated, children: [] },
    postAuthorId: post.author.toString(),
    isFlagged: comment.isFlagged,
  };
};

/**
 * Handles comment voting with idempotency.
 * Updates Wilson score for best-comment sorting.
 */
const voteComment = async (commentId, userId, direction) => {
  const comment = await Comment.findById(commentId).select('post upvotes downvotes score author');
  if (!comment) throw new AppError('Comment not found', 404);

  const hasUpvoted = comment.upvotes.some((id) => id.toString() === userId);
  const hasDownvoted = comment.downvotes.some((id) => id.toString() === userId);

  comment.upvotes.pull(userId);
  comment.downvotes.pull(userId);

  let userVote = 0;

  if (direction === 1 && !hasUpvoted) {
    comment.upvotes.push(userId);
    userVote = 1;
  } else if (direction === -1 && !hasDownvoted) {
    comment.downvotes.push(userId);
    userVote = -1;
  }

  const ups = comment.upvotes.length;
  const downs = comment.downvotes.length;
  comment.score = ups - downs;
  comment.wilsonScore = wilsonScore(ups, downs);

  await comment.save();
  await cache.del(`comments:${comment.post}`);

  return { score: comment.score, userVote, postId: comment.post.toString() };
};

/**
 * Soft-deletes a comment (replaces body with '[deleted]').
 * Preserves thread structure.
 */
const deleteComment = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.author.toString() !== userId) {
    throw new AppError('You can only delete your own comments', 403);
  }

  comment.body = '[deleted]';
  comment.isDeleted = true;
  await comment.save();

  await cache.del(`comments:${comment.post}`);
};

module.exports = { getComments, createComment, voteComment, deleteComment };
