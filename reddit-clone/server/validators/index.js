const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware that reads validation errors and returns a 422 if any exist.
 * Always place this after the validation chains.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'fail',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth ─────────────────────────────────────────────────────────────────────

exports.registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3–20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username may only contain letters, numbers, underscores, and hyphens'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validate,
];

exports.loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
];

// ── Posts ─────────────────────────────────────────────────────────────────────

exports.createPostValidator = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be 1–300 characters'),
  body('subredditName').trim().notEmpty().withMessage('Community is required'),
  body('type')
    .optional()
    .isIn(['text', 'link', 'image'])
    .withMessage('Type must be text, link, or image'),
  body('url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL must be a valid URL'),
  validate,
];

exports.voteValidator = [
  body('direction')
    .isIn([1, -1])
    .withMessage('Direction must be 1 (upvote) or -1 (downvote)'),
  validate,
];

exports.postSearchValidator = [
  query('q').trim().isLength({ min: 1 }).withMessage('Search query required'),
  validate,
];

// ── Comments ─────────────────────────────────────────────────────────────────

exports.createCommentValidator = [
  body('body')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Comment must be 1–10,000 characters'),
  body('postId').isMongoId().withMessage('Invalid post ID'),
  body('parentId').optional().isMongoId().withMessage('Invalid parent comment ID'),
  validate,
];

// ── Subreddits ────────────────────────────────────────────────────────────────

exports.createSubredditValidator = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 21 })
    .withMessage('Community name must be 3–21 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Community name may only contain letters, numbers, and underscores'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate,
];
