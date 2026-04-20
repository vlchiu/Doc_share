const express = require('express');
const { getAllUsers, toggleUserActive, changeUserRole, getStats } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', verifyToken, getStats);
router.get('/users', verifyToken, getAllUsers);
router.put('/users/:id/toggle-active', verifyToken, toggleUserActive);
router.put('/users/:id/role', verifyToken, changeUserRole);

module.exports = router;
