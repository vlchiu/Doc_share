const express = require('express');
const { toggleFollow, getFollowStatus, getFollowers, getFollowing } = require('../controllers/followController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:userId', verifyToken, toggleFollow);
router.get('/:userId/status', getFollowStatus);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);

module.exports = router;
