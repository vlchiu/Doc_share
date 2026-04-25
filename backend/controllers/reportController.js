const prisma = require('../db');

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
        document: { select: { id: true, title: true, file_url: true } }
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

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: { document: { select: { id: true, title: true, user_id: true } } }
    });
    if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    if (report.status === 'RESOLVED') return res.status(400).json({ message: "Báo cáo này đã được xử lý rồi" });

    // Thực hiện biện pháp
    if (action === 'REMOVE' && report.document) {
      await prisma.document.update({
        where: { id: report.document.id },
        data: { deleted_at: new Date() }
      });
      const noteText = admin_note?.trim() ? ` Ghi chú: "${admin_note.trim()}"` : '';
      prisma.notification.create({
        data: {
          user_id: report.document.user_id,
          content: `🚫 Tài liệu "${report.document.title}" đã bị gỡ xuống do vi phạm nội quy.${noteText}`,
          link: '/my-documents'
        }
      }).catch(() => {});
    } else if (action === 'WARN' && report.document) {
      const noteText = admin_note?.trim() ? ` Ghi chú từ Admin: "${admin_note.trim()}"` : '';
      prisma.notification.create({
        data: {
          user_id: report.document.user_id,
          content: `⚠️ Tài liệu "${report.document.title}" của bạn bị báo cáo vi phạm. Vui lòng kiểm tra lại nội dung.${noteText}`,
          link: `/documents/${report.document.id}`
        }
      }).catch(() => {});
    }

    // Đánh dấu tất cả báo cáo cùng tài liệu là đã xử lý
    await prisma.report.updateMany({
      where: { document_id: report.document?.id, status: 'PENDING' },
      data: { status: 'RESOLVED', action, admin_note: admin_note?.trim() || null }
    });

    res.json({ message: "Đã xử lý báo cáo!", action });
  } catch (error) {
    console.error('resolveReport error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { reportDocument, getReports, resolveReport };
