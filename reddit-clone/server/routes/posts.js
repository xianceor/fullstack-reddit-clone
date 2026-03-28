const router = require('express').Router();
const postController = require('../controllers/postController');
const { protect, optionalAuth, voteLimiter } = require('../middleware/auth');
const { createPostValidator, voteValidator, postSearchValidator } = require('../validators');

router.get('/',          optionalAuth, postController.getPosts);
router.get('/search',    optionalAuth, postSearchValidator, postController.searchPosts);
router.get('/:id',       optionalAuth, postController.getPost);
router.post('/',         protect, createPostValidator, postController.createPost);
router.post('/:id/vote', protect, voteLimiter, voteValidator, postController.votePost);
router.delete('/:id',    protect, postController.deletePost);

module.exports = router;
