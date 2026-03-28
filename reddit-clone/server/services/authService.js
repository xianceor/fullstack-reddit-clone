const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cache = require('../config/redis');
const { AppError } = require('../utils/appError');

/**
 * Generates a signed JWT for a user.
 * Payload is minimal — only what's needed to authenticate requests.
 */
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * Registers a new user.
 * Returns the created user (without password) and a JWT.
 */
const register = async ({ username, email, password }) => {
  // Check uniqueness early to return clear errors
  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  }).lean();

  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
    throw new AppError(`${field} is already taken`, 409);
  }

  const user = await User.create({ username, email: email.toLowerCase(), password });
  const token = generateToken(user);

  return { user: user.toJSON(), token };
};

/**
 * Authenticates a user with email + password.
 */
const login = async ({ email, password }) => {
  // Include password field explicitly (it's excluded by default in the schema)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  const token = generateToken(user);
  return { user: user.toJSON(), token };
};

/**
 * Fetches the currently authenticated user, leveraging the cache.
 */
const getMe = async (userId) => {
  return cache.getOrSet(
    `user:${userId}`,
    () =>
      User.findById(userId)
        .populate('joinedSubreddits', 'name icon')
        .select('-__v')
        .lean(),
    300 // 5 minutes
  );
};

module.exports = { generateToken, register, login, getMe };
