const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config(); // PHẢI chạy trước tất cả

const passport = require('passport');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const followRoutes = require('./routes/followRoutes');

// Khởi tạo Google Strategy SAU khi dotenv đã load
require('./controllers/googleAuthController');
const googleAuthRoutes = require('./routes/googleAuthRoutes');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(passport.initialize());

app.use('/uploads', express.static('uploads'));

app.get('/api/test', (req, res) => {
  res.json({ message: "🚀 Backend Document Sharing Web đang chạy mượt mà!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follow', followRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
  console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing GOOGLE_CLIENT_ID'}`);
});