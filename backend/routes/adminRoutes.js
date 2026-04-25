const express = require('express');
const { getAllUsers, toggleUserActive, changeUserRole, getStats } = require('../controllers/adminController');
const { getReports, resolveReport } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', verifyToken, getStats);
router.get('/users', verifyToken, getAllUsers);
router.put('/users/:id/toggle-active', verifyToken, toggleUserActive);
router.put('/users/:id/role', verifyToken, changeUserRole);
router.get('/reports', verifyToken, getReports);
router.put('/reports/:id/resolve', verifyToken, resolveReport);

module.exports = router;
