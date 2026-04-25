const prisma = require('../db');

// [GET] Lấy danh sách tất cả users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || '';

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true,
          _count: { select: { documents: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] Khóa / Mở khóa tài khoản user (Admin only)
const toggleUserActive = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });

    const { id } = req.params;
    const userId = parseInt(id);

    if (userId === req.user.userId) return res.status(400).json({ message: "Không thể khóa tài khoản của chính mình" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { is_active: !user.is_active },
      select: { id: true, name: true, email: true, is_active: true }
    });

    res.json({ message: updated.is_active ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] Đổi role user (Admin only)
const changeUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });

    const { id } = req.params;
    const { role } = req.body;
    const userId = parseInt(id);

    if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ message: "Role không hợp lệ" });
    if (userId === req.user.userId) return res.status(400).json({ message: "Không thể đổi role của chính mình" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ message: "Đã cập nhật role", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Thống kê tổng quan (Admin only)
const getStats = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });

    const [totalUsers, totalDocs, pendingDocs, totalComments, topDocs] = await Promise.all([
      prisma.user.count(),
      prisma.document.count({ where: { status: 'APPROVED', deleted_at: null } }),
      prisma.document.count({ where: { status: 'PENDING', deleted_at: null } }),
      prisma.comment.count(),
      prisma.document.findMany({
        where: { status: 'APPROVED', deleted_at: null },
        orderBy: { download_count: 'desc' },
        take: 5,
        select: { id: true, title: true, download_count: true, view_count: true }
      })
    ]);

    // Thống kê 7 ngày gần nhất
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const chartData = await Promise.all(days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const [uploads, downloads] = await Promise.all([
        prisma.document.count({ where: { created_at: { gte: day, lt: nextDay } } }),
        prisma.downloadHistory.count({ where: { created_at: { gte: day, lt: nextDay } } }),
      ]);
      return {
        date: day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        uploads,
        downloads,
      };
    }));

    res.json({ totalUsers, totalDocs, pendingDocs, totalComments, topDocs, chartData });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { getAllUsers, toggleUserActive, changeUserRole, getStats };
