const commentService = require('../services/commentService');
const { asyncHandler } = require('../utils/appError');
const { emitNewComment, emitCommentVote, emitNotification } = require('../config/socket');

/**
 * GET /api/comments?postId=xxx
 */
exports.getComments = asyncHandler(async (req, res) => {
  const { postId } = req.query;
  if (!postId) return res.status(400).json({ message: 'postId query param required' });
  const comments = await commentService.getComments(postId);
  res.json(comments);
});

/**
 * POST /api/comments
 * Body: body, postId, parentId?
 */
exports.createComment = asyncHandler(async (req, res) => {
  const { body, postId, parentId } = req.body;
  const { comment, postAuthorId, isFlagged } = await commentService.createComment({
    body, postId, parentId, userId: req.user.id,
  });

  // Real-time: push comment to everyone viewing the post
  try {
    emitNewComment(postId, comment);
  } catch { /* non-critical */ }

  // Notify post author if someone else commented
  if (postAuthorId && postAuthorId !== req.user.id) {
    try {
      emitNotification(postAuthorId, {
        type: 'comment',
        message: `u/${req.user.username} commented on your post`,
        postId,
        commentId: comment._id,
      });
    } catch { /* non-critical */ }
  }

  res.status(201).json({
    ...comment,
    ...(isFlagged ? { warning: 'Your comment has been flagged for review.' } : {}),
  });
});

/**
 * POST /api/comments/:id/vote
 * Body: direction (1 | -1)
 */
exports.voteComment = asyncHandler(async (req, res) => {
  const { direction } = req.body;
  const result = await commentService.voteComment(req.params.id, req.user.id, direction);

  try {
    emitCommentVote(result.postId, req.params.id, result.score);
  } catch { /* non-critical */ }

  res.json(result);
});

/**
 * DELETE /api/comments/:id
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user.id);
  res.json({ status: 'success', message: 'Comment deleted' });
});
