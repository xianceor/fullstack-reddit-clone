const authService = require('../services/authService');
const { asyncHandler } = require('../utils/appError');

/**
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const { user, token } = await authService.register({ username, email, password });
  res.status(201).json({ status: 'success', token, user });
});

/**
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });
  res.json({ status: 'success', token, user });
});

/**
 * GET /api/auth/me  (protected)
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});
