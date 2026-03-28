const router = require('express').Router();
const commentController = require('../controllers/commentController');
const { protect, voteLimiter } = require('../middleware/auth');
const { createCommentValidator, voteValidator } = require('../validators');

router.get('/',          commentController.getComments);
router.post('/',         protect, createCommentValidator, commentController.createComment);
router.post('/:id/vote', protect, voteLimiter, voteValidator, commentController.voteComment);
router.delete('/:id',    protect, commentController.deleteComment);

module.exports = router;
