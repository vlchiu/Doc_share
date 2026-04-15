const express = require('express');
const { getCategories } = require('../controllers/categoryController');
const router = express.Router();

// Ai cũng có thể xem danh sách danh mục
router.get('/', getCategories);

module.exports = router;