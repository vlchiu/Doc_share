const prisma = require('../db');
const { serializable } = require('../utils/transaction');

// [POST] Báo cáo tài liệu
const reportDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    if (!reason?.trim()) return res.status(400).json({ message: "Vui lòng nhập lý do báo cáo" });
    if (reason.trim().length > 500) return res.status(400).json({ message: "Lý do không được quá 500 ký tự" });

    // Kiểm tra đã báo cáo chưa
    const existing = await prisma.report.findFirst({
      where: { user_id: userId, document_id: parseInt(id), status: 'PENDING' }
    });
    if (existing) return res.status(400).json({ message: "Bạn đã báo cáo tài liệu này rồi" });

    await prisma.report.create({
      data: { user_id: userId, document_id: parseInt(id), reason: reason.trim() }
    });

    // Thông báo cho admin
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', is_active: true }, select: { id: true } });
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { title: true } });
    if (doc && admins.length > 0) {
      await Promise.all(admins.map(admin =>
        prisma.notification.create({
          data: { user_id: admin.id, content: `🚨 Tài liệu "${doc.title}" bị báo cáo vi phạm`, link: `/admin` }
        })
      ));
    }

    res.status(201).json({ message: "Đã gửi báo cáo. Chúng tôi sẽ xem xét sớm!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Admin: Lấy danh sách báo cáo
const getReports = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const reports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, email: true } },
        document: { select: { id: true, title: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [PUT] Admin: Xử lý báo cáo với biện pháp cụ thể
const resolveReport = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const { id } = req.params;
    const { action, admin_note } = req.body;
    // action: WARN | REMOVE | IGNORE

    if (!action || !['WARN', 'REMOVE', 'IGNORE'].includes(action)) {
      return res.status(400).json({ message: "Vui lòng chọn biện pháp xử lý: WARN, REMOVE hoặc IGNORE" });
    }

    const outcome = await serializable(async tx => {
      const report = await tx.report.findUnique({ where: { id: Number(id) }, include: { document: true } });
      if (!report) return 404;
      if (report.status === 'RESOLVED') return 409;
      const note = typeof admin_note === 'string' ? admin_note.trim().slice(0, 2000) : '';
      if (action === 'REMOVE') {
        await tx.document.update({ where: { id: report.document_id }, data: {
          deleted_at: new Date(), removed_by_admin: true, content_version: { increment: 1 },
        } });
      }
      await tx.report.updateMany({ where: { document_id: report.document_id, status: 'PENDING' },
        data: { status: 'RESOLVED', action, admin_note: note || null } });
      if (action !== 'IGNORE') await tx.notification.create({ data: {
        user_id: report.document.user_id,
        content: `${action === 'REMOVE' ? 'Tài liệu đã bị gỡ' : 'Cảnh báo tài liệu'}: "${report.document.title}".${note ? ' ' + note : ''}`,
        link: action === 'REMOVE' ? '/my-documents' : `/documents/${report.document_id}`,
      } });
      return 200;
    });
    if (outcome !== 200) return res.status(outcome).json({ message: 'Báo cáo không tồn tại hoặc đã được xử lý.' });

    res.json({ message: "Đã xử lý báo cáo!", action });
  } catch (error) {
    console.error('resolveReport error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { reportDocument, getReports, resolveReport };
