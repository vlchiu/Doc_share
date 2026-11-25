const express = require('express');
const { toggleFollow, follow, unfollow, getFollowStatus, getFollowers, getFollowing } = require('../controllers/followController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:userId', verifyToken, toggleFollow);
router.put('/:userId', verifyToken, follow);
router.delete('/:userId', verifyToken, unfollow);
router.get('/:userId/status', optionalAuth, getFollowStatus);
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

module.exports = router;
