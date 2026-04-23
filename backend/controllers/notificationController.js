const prisma = require('../db');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 30,
      select: { id: true, content: true, link: true, is_read: true, created_at: true }
    });
    const unreadCount = await prisma.notification.count({ where: { user_id: userId, is_read: false } });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

const markAllRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.notification.updateMany({ where: { user_id: userId, is_read: false }, data: { is_read: true } });
    res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { getNotifications, markAllRead };
