const postService = require('../services/postService');
const { asyncHandler } = require('../utils/appError');
const { emitPostVote, emitNewPost } = require('../config/socket');

/**
 * GET /api/posts
 * Query: sort, subreddit, page, limit
 */
exports.getPosts = asyncHandler(async (req, res) => {
  const { sort, subreddit, page, limit } = req.query;
  const data = await postService.getPosts({ sort, subredditName: subreddit, page, limit });
  res.json(data);
});

/**
 * GET /api/posts/search
 * Query: q, sort, page, subreddit
 */
exports.searchPosts = asyncHandler(async (req, res) => {
  const { q, sort, page, subreddit } = req.query;
  const data = await postService.searchPosts({ query: q, sort, page, subredditName: subreddit });
  res.json(data);
});

/**
 * GET /api/posts/:id
 */
exports.getPost = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id);
  if (!post) {
    return res.status(404).json({ status: 'fail', message: 'Post not found' });
  }
  res.json(post);
});

/**
 * POST /api/posts
 * Body: title, body, url, type, subredditName, flair
 */
exports.createPost = asyncHandler(async (req, res) => {
  const { title, body, url, type, subredditName, flair } = req.body;
  const post = await postService.createPost({
    title, body, url, type, subredditName, flair,
    userId: req.user.id,
  });

  // Notify subreddit room of new post in real-time
  try {
    emitNewPost(subredditName, post);
  } catch { /* socket not critical */ }

  res.status(201).json(post);
});

/**
 * POST /api/posts/:id/vote
 * Body: direction (1 | -1)
 */
exports.votePost = asyncHandler(async (req, res) => {
  const { direction } = req.body;
  const result = await postService.votePost(req.params.id, req.user.id, direction);

  // Broadcast vote to all users viewing this post
  try {
    emitPostVote(req.params.id, { ...result, userId: req.user.id });
  } catch { /* socket not critical */ }

  res.json(result);
});

/**
 * DELETE /api/posts/:id
 */
exports.deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user.id);
  res.json({ status: 'success', message: 'Post deleted' });
});
