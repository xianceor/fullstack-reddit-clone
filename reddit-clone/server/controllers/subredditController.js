const subredditService = require('../services/subredditService');
const { asyncHandler } = require('../utils/appError');

/** GET /api/subreddits */
exports.getSubreddits = asyncHandler(async (req, res) => {
  const subreddits = await subredditService.getSubreddits();
  res.json(subreddits);
});

/** GET /api/subreddits/search?q= */
exports.searchSubreddits = asyncHandler(async (req, res) => {
  const results = await subredditService.searchSubreddits(req.query.q);
  res.json(results);
});

/** GET /api/subreddits/:name */
exports.getSubreddit = asyncHandler(async (req, res) => {
  const subreddit = await subredditService.getSubreddit(req.params.name);
  if (!subreddit) return res.status(404).json({ message: 'Subreddit not found' });
  res.json(subreddit);
});

/** POST /api/subreddits */
exports.createSubreddit = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const subreddit = await subredditService.createSubreddit({
    name, description, userId: req.user.id,
  });
  res.status(201).json(subreddit);
});

/** POST /api/subreddits/:name/join */
exports.toggleMembership = asyncHandler(async (req, res) => {
  const result = await subredditService.toggleMembership(req.params.name, req.user.id);
  res.json(result);
});
