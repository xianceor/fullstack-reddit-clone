const router = require('express').Router();
const subredditController = require('../controllers/subredditController');
const { protect } = require('../middleware/auth');
const { createSubredditValidator } = require('../validators');

router.get('/',            subredditController.getSubreddits);
router.get('/search',      subredditController.searchSubreddits);
router.get('/:name',       subredditController.getSubreddit);
router.post('/',           protect, createSubredditValidator, subredditController.createSubreddit);
router.post('/:name/join', protect, subredditController.toggleMembership);

module.exports = router;
