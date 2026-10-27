const { serializable } = require('../utils/transaction');
const prisma = require('../db');
const { publicDocument } = require('../utils/documentAccess');

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
      data: { is_active: !user.is_active, token_version: { increment: 1 } },
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
      data: { role, token_version: { increment: 1 } },
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
      prisma.document.count({ where: { status: 'APPROVED', deleted_at: null, removed_by_admin: false } }),
      prisma.document.count({ where: { status: 'PENDING', deleted_at: null } }),
      prisma.comment.count(),
      prisma.document.findMany({
        where: { status: 'APPROVED', deleted_at: null, removed_by_admin: false },
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

// [GET] Lấy danh sách tài liệu đã được AI kiểm duyệt (Admin only)
const getAiModeratedDocs = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Không có quyền truy cập' });

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const filter = req.query.verdict || ''; // 'APPROVE' | 'REJECT' | 'PENDING' | ''

    // Lấy toàn bộ tài liệu có ai_moderation_result để tính summary chính xác
    const allDocs = await prisma.document.findMany({
      where: {
        ai_moderation_result: { not: null },
        deleted_at: null,
      },
      include: {
        user:     { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    const parsedDocs = allDocs.map(doc => {
      let aiResult = null;
      try {
        if (doc.ai_moderation_result) aiResult = JSON.parse(doc.ai_moderation_result);
      } catch {}

      if (aiResult?.verdict === 'APPROVE') approvedCount++;
      else if (aiResult?.verdict === 'REJECT') rejectedCount++;
      else if (aiResult?.verdict === 'PENDING') pendingCount++;

      return { ...publicDocument(doc), aiResult };
    });

    const filteredDocs = filter
      ? parsedDocs.filter(d => d.aiResult?.verdict === filter)
      : parsedDocs;

    const total = filteredDocs.length;
    const skip = (page - 1) * limit;
    const paginatedDocs = filteredDocs.slice(skip, skip + limit);

    res.json({
      docs: paginatedDocs,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: {
        total: allDocs.length,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount,
      },
    });
  } catch (error) {
    console.error('getAiModeratedDocs error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


// Hard deletion is limited to users without documents, payments or moderation records.
const deleteUser = async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Không có quyền truy cập.' });
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tài khoản không hợp lệ.' });
  if (id === req.user.userId) return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình.' });
  try {
    const result = await serializable(async tx => {
      const target = await tx.user.findUnique({ where: { id }, select: {
        id: true, role: true, email: true,
        _count: { select: { documents: true, payments: true, reports: true } },
      } });
      if (!target) return { status: 404, message: 'Tài khoản không còn tồn tại.' };
      if (target.role === 'ADMIN') return { status: 403, message: 'Không được xóa tài khoản quản trị viên.' };
      if (req.body?.confirmEmail !== target.email) return { status: 400, message: 'Email xác nhận không khớp. Hãy tải lại danh sách và thử lại.' };
      if (target._count.documents || target._count.payments || target._count.reports) {
        return { status: 409, message: 'Tài khoản có tài liệu, giao dịch hoặc báo cáo vi phạm. Hãy dùng chức năng khóa để giữ dữ liệu và lịch sử đối soát.' };
      }
      for (const model of ['comment', 'rating', 'savedDocument', 'downloadHistory', 'notification']) {
        await tx[model].deleteMany({ where: { user_id: id } });
      }
      await tx.follow.deleteMany({ where: { OR: [{ follower_id: id }, { following_id: id }] } });
      await tx.user.delete({ where: { id } });
      return { status: 200, message: 'Đã xóa tài khoản người dùng.' };
    });
    return res.status(result.status).json({ message: result.message });
  } catch (error) {
    if (['P2003', 'P2034', 'P2025'].includes(error.code)) return res.status(409).json({ message: 'Dữ liệu tài khoản vừa thay đổi. Hãy tải lại danh sách trước khi xóa.' });
    console.error('Delete user failed:', error.code || error.name);
    return res.status(500).json({ message: 'Không thể xóa tài khoản. Vui lòng thử lại.' });
  }
};

module.exports = { deleteUser, getAllUsers, toggleUserActive, changeUserRole, getStats, getAiModeratedDocs };

