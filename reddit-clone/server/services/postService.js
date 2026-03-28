const Post = require('../models/Post');
const Subreddit = require('../models/Subreddit');
const User = require('../models/User');
const cache = require('../config/redis');
const { hotScore } = require('../utils/ranking');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

const POSTS_PER_PAGE = 25;
const CACHE_TTL = {
  HOT_FEED: 120,   // 2 min — hot changes slowly
  NEW_FEED: 30,    // 30 sec — new needs freshness
  TOP_FEED: 300,   // 5 min — top is stable
  SINGLE_POST: 60,
};

/**
 * Builds the sort pipeline for aggregation based on sort type.
 */
const buildSortStage = (sort) => {
  switch (sort) {
    case 'new':  return { createdAt: -1 };
    case 'top':  return { score: -1, createdAt: -1 };
    case 'controversial': return { controversyScore: -1, createdAt: -1 };
    case 'hot':
    default:     return { hotScore: -1, createdAt: -1 };
  }
};

/**
 * Fetches paginated posts with optional subreddit filtering.
 * Results for hot/top feeds are cached in Redis.
 */
const getPosts = async ({ sort = 'hot', subredditName, page = 1, limit = POSTS_PER_PAGE }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit) || POSTS_PER_PAGE, 100);
  const skip = (pageNum - 1) * limitNum;

  // Build cache key
  const cacheKey = `posts:${sort}:${subredditName || 'all'}:${pageNum}`;
  const ttl = CACHE_TTL[`${sort.toUpperCase()}_FEED`] || 60;

  return cache.getOrSet(cacheKey, async () => {
    const matchStage = {};

    if (subredditName) {
      const sub = await Subreddit.findOne({ name: subredditName }).select('_id').lean();
      if (!sub) throw new AppError(`r/${subredditName} not found`, 404);
      matchStage.subreddit = sub._id;
    }

    const sortStage = buildSortStage(sort);

    const [posts, total] = await Promise.all([
      Post.find(matchStage)
        .sort(sortStage)
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username karma avatar')
        .populate('subreddit', 'name icon')
        .select('-__v')
        .lean(),
      Post.countDocuments(matchStage),
    ]);

    return {
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    };
  }, ttl);
};

/**
 * Fetches a single post by ID (cached).
 */
const getPostById = async (postId) => {
  return cache.getOrSet(
    `post:${postId}`,
    () =>
      Post.findById(postId)
        .populate('author', 'username karma avatar createdAt')
        .populate('subreddit', 'name icon description memberCount')
        .select('-__v')
        .lean(),
    CACHE_TTL.SINGLE_POST
  );
};

/**
 * Creates a new post, associates it with a subreddit, and invalidates feed cache.
 */
const createPost = async ({ title, body, url, type, subredditName, flair, userId }) => {
  const subreddit = await Subreddit.findOne({ name: subredditName }).lean();
  if (!subreddit) throw new AppError(`r/${subredditName} not found`, 404);

  const upvotes = [userId];
  const score = 1;
  const hot = hotScore(1, 0, new Date());

  const post = await Post.create({
    title: title.trim(),
    body: body?.trim() || '',
    url: url?.trim() || '',
    type: type || 'text',
    flair: flair?.trim() || '',
    author: userId,
    subreddit: subreddit._id,
    upvotes,
    score,
    hotScore: hot,
  });

  // Award karma to author
  await User.findByIdAndUpdate(userId, { $inc: { karma: 1 } });

  // Invalidate all feed caches for this subreddit and global feed
  await cache.del(`posts:*:${subredditName}:*`);
  await cache.del('posts:*:all:*');

  const populated = await Post.findById(post._id)
    .populate('author', 'username karma avatar')
    .populate('subreddit', 'name icon')
    .lean();

  return populated;
};

/**
 * Handles voting logic with idempotency:
 * - Same direction = undo vote
 * - Opposite direction = switch vote
 * Updates the hot score and score atomically.
 *
 * @returns {{score, upvotes, downvotes, userVote}} Updated vote state
 */
const votePost = async (postId, userId, direction) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', 404);

  const hasUpvoted = post.upvotes.some((id) => id.toString() === userId);
  const hasDownvoted = post.downvotes.some((id) => id.toString() === userId);

  // Remove existing vote
  post.upvotes.pull(userId);
  post.downvotes.pull(userId);

  let userVote = 0;

  if (direction === 1 && !hasUpvoted) {
    post.upvotes.push(userId);
    userVote = 1;
  } else if (direction === -1 && !hasDownvoted) {
    post.downvotes.push(userId);
    userVote = -1;
  }

  const ups = post.upvotes.length;
  const downs = post.downvotes.length;
  post.score = ups - downs;
  post.hotScore = hotScore(ups, downs, post.createdAt);

  await post.save();

  // Invalidate caches
  await cache.del(`post:${postId}`);
  await cache.del('posts:hot:*');

  return {
    score: post.score,
    upvotes: ups,
    downvotes: downs,
    userVote,
  };
};

/**
 * Deletes a post (author only). Clears related caches.
 */
const deletePost = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', 404);
  if (post.author.toString() !== userId) {
    throw new AppError('You can only delete your own posts', 403);
  }

  await post.deleteOne();
  await cache.del(`post:${postId}`);
  await cache.del('posts:*');
};

/**
 * Full-text search for posts.
 * Uses MongoDB $text index — fast and no extra dependency.
 */
const searchPosts = async ({ query, sort = 'relevance', page = 1, subredditName }) => {
  if (!query?.trim()) throw new AppError('Search query required', 400);

  const pageNum = Math.max(1, parseInt(page));
  const limit = 25;
  const skip = (pageNum - 1) * limit;

  const matchStage = { $text: { $search: query } };
  if (subredditName) {
    const sub = await Subreddit.findOne({ name: subredditName }).select('_id').lean();
    if (sub) matchStage.subreddit = sub._id;
  }

  const sortStage =
    sort === 'relevance'
      ? { score: { $meta: 'textScore' }, hotScore: -1 }
      : sort === 'new'
      ? { createdAt: -1 }
      : { score: -1 };

  const [posts, total] = await Promise.all([
    Post.find(matchStage, sort === 'relevance' ? { score: { $meta: 'textScore' } } : {})
      .sort(sortStage)
      .skip(skip)
      .limit(limit)
      .populate('author', 'username')
      .populate('subreddit', 'name icon')
      .lean(),
    Post.countDocuments(matchStage),
  ]);

  return {
    posts,
    pagination: { page: pageNum, total, pages: Math.ceil(total / limit) },
  };
};

module.exports = { getPosts, getPostById, createPost, votePost, deletePost, searchPosts };
