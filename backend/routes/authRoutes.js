const express = require('express');
// SỬA Ở ĐÂY: Thêm updateProfile vào danh sách import
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController'); 
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Import middleware upload ảnh

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Route lấy thông tin cá nhân (Cần đăng nhập)
router.get('/me', verifyToken, getMe);

// Route cập nhật Profile và Avatar (Cần đăng nhập)
router.put('/update-profile', verifyToken, upload.single('avatar'), updateProfile);

// Route đổi mật khẩu
router.put('/change-password', verifyToken, changePassword);

module.exports = router;