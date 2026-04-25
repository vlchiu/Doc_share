// backend/controllers/documentController.js
const prisma = require('../db');
const fs = require('fs'); // Thư viện xử lý file (MỚI)
const path = require('path'); // Thư viện xử lý đường dẫn (MỚI)

// [POST] Tải tài liệu lên
const uploadDocument = async (req, res) => {
  try {
    const { title, description, category_id, doc_type } = req.body;
    const file = req.file;
    const userId = req.user.userId; 

    // Validation
    if (!title || !title.trim()) return res.status(400).json({ message: "Tên tài liệu không được để trống" });
    if (title.trim().length > 200) return res.status(400).json({ message: "Tên tài liệu không được quá 200 ký tự" });
    if (!category_id) return res.status(400).json({ message: "Vui lòng chọn danh mục" });
    if (!file) return res.status(400).json({ message: "Vui lòng chọn file" });

    const VALID_DOC_TYPES = ['Chung', 'Hardware', 'Software', 'Thông báo'];
    const validDocType = VALID_DOC_TYPES.includes(doc_type) ? doc_type : 'Chung';

    const newDoc = await prisma.document.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        file_url: `/uploads/${file.filename}`,
        file_type: file.mimetype,
        category_id: parseInt(category_id),
        user_id: userId,
        doc_type: validDocType
      }
    });

    res.status(201).json({ message: "Tải lên thành công chờ duyệt!", document: newDoc });

    // Thông báo cho những người đang follow user này
    prisma.follow.findMany({
      where: { following_id: userId },
      select: { follower_id: true }
    }).then(followers => {
      if (followers.length === 0) return;
      const user = prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      return user.then(u => {
        return Promise.all(followers.map(f =>
          prisma.notification.create({
            data: {
              user_id: f.follower_id,
              content: `📄 ${u.name} vừa đăng tài liệu mới: "${newDoc.title}"`,
              link: `/documents/${newDoc.id}`
            }
          })
        ));
      });
    }).catch(() => {});
  } catch (error) {
    // Xóa file đã upload nếu tạo document thất bại
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "File quá lớn! Giới hạn tối đa là 20MB." });
    }
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Lấy chi tiết 1 tài liệu theo ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const docId = parseInt(id);
    if (isNaN(docId) || docId < 1) return res.status(400).json({ message: "ID không hợp lệ" });

    // Lấy userId từ token nếu có (optional auth)
    const authHeader = req.header('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const verified = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        userId = verified.userId;
      } catch {}
    }

    const [doc, savedRecord, ratingAgg, userRating] = await Promise.all([
      prisma.document.findUnique({
        where: { id: docId },
        include: {
          category: true,
          user: { select: { id: true, name: true, avatar_url: true } },
          comments: {
            include: { user: { select: { id: true, name: true, avatar_url: true } } },
            orderBy: { created_at: 'desc' }
          }
        }
      }),
      userId ? prisma.savedDocument.findUnique({
        where: { user_id_document_id: { user_id: userId, document_id: docId } }
      }) : Promise.resolve(null),
      prisma.rating.aggregate({
        where: { document_id: docId },
        _avg: { score: true },
        _count: { score: true }
      }),
      userId ? prisma.rating.findUnique({
        where: { user_id_document_id: { user_id: userId, document_id: docId } }
      }) : Promise.resolve(null)
    ]);

    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    if (doc.deleted_at) return res.status(404).json({ message: "Tài liệu không tồn tại" });
    // Chỉ chủ tài liệu hoặc admin mới xem được tài liệu chưa duyệt
    if (doc.status !== 'APPROVED') {
      if (!userId) return res.status(403).json({ message: "Tài liệu chưa được duyệt" });
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (doc.user_id !== userId && currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ message: "Tài liệu chưa được duyệt" });
      }
    }

    // Lấy tất cả thông báo từ admin (báo cáo đã xử lý) — chỉ trả về cho chủ tài liệu hoặc admin
    let adminNotices = [];
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const isOwner = doc.user_id === userId;
      const isAdmin = currentUser?.role === 'ADMIN';

      if (isOwner || isAdmin) {
        adminNotices = await prisma.report.findMany({
          where: { document_id: docId, status: 'RESOLVED', action: { in: ['WARN', 'REMOVE'] } },
          orderBy: { created_at: 'asc' }, // cũ nhất lên trên
          select: { id: true, action: true, admin_note: true, created_at: true }
        });
      }
    }

    res.json({
      ...doc,
      isSaved: !!savedRecord,
      avgScore: ratingAgg._avg.score,
      totalRatings: ratingAgg._count.score,
      userScore: userRating?.score || null,
      adminNotices,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Lấy tất cả tài liệu (Chỉ lấy tài liệu ĐÃ DUYỆT) - có pagination + search
const getAllDocuments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || '';
    const category = req.query.category || '';
    const docType = req.query.docType || '';
    const sortBy = req.query.sortBy || 'newest';
    const fileType = req.query.fileType || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    const FILE_TYPE_MAP = {
      'pdf': ['application/pdf'],
      'word': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'excel': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'powerpoint': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      'zip': ['application/zip', 'application/x-rar-compressed'],
    };

    const fileTypeFilter = fileType
      ? FILE_TYPE_MAP[fileType]
        ? { file_type: { in: FILE_TYPE_MAP[fileType] } }
        : { file_type: { contains: fileType, mode: 'insensitive' } }
      : {};

    const where = {
      status: 'APPROVED',
      deleted_at: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ]
      }),
      ...(category && { category_id: parseInt(category) }),
      ...(docType && { doc_type: docType }),
      ...fileTypeFilter,
      ...(dateFrom || dateTo ? {
        created_at: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
        }
      } : {}),
    };

    const orderBy =
      sortBy === 'downloads' ? { download_count: 'desc' } :
      sortBy === 'views'     ? { view_count: 'desc' } :
                               { created_at: 'desc' };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      documents,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


// [PUT] Cập nhật thông tin tài liệu
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id } = req.body;
    const file = req.file;
    const userId = req.user.userId;

    // Kiểm tra quyền
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (doc.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền sửa tài liệu này" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category_id !== undefined) updateData.category_id = parseInt(category_id);
    if (file) {
      updateData.file_url = `/uploads/${file.filename}`;
      updateData.file_type = file.mimetype;
    }

    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(200).json({ message: "Cập nhật thành công!", document: updatedDoc });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi cập nhật", error: error.message });
  }
};
// [DELETE] Xóa tài liệu (soft delete — chuyển vào thùng rác)
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    if (doc.deleted_at) return res.status(400).json({ message: "Tài liệu đã ở trong thùng rác" });

    if (doc.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này" });
    }

    await prisma.document.update({
      where: { id: parseInt(id) },
      data: { deleted_at: new Date() }
    });

    res.json({ message: "Đã chuyển vào thùng rác!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi xóa", error: error.message });
  }
};

// [PUT] Khôi phục tài liệu từ thùng rác
const restoreDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    if (!doc.deleted_at) return res.status(400).json({ message: "Tài liệu không ở trong thùng rác" });

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (doc.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền khôi phục tài liệu này" });
    }

    await prisma.document.update({
      where: { id: parseInt(id) },
      data: { deleted_at: null }
    });

    res.json({ message: "Đã khôi phục tài liệu!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// [DELETE] Xóa vĩnh viễn khỏi thùng rác
const permanentDeleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (doc.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này" });
    }

    // Xóa file vật lý
    if (doc.file_url) {
      const filePath = path.join(__dirname, '..', doc.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.comment.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.savedDocument.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.downloadHistory.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.rating.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.report.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.document.delete({ where: { id: parseInt(id) } });

    res.json({ message: "Đã xóa vĩnh viễn!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi xóa", error: error.message });
  }
};

// [GET] Lấy tài liệu trong thùng rác của user
const getTrashDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const where = currentUser.role === 'ADMIN'
      ? { deleted_at: { not: null } }
      : { user_id: userId, deleted_at: { not: null } };

    const docs = await prisma.document.findMany({
      where,
      include: { category: true, user: { select: { name: true } } },
      orderBy: { deleted_at: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [POST] Tăng lượt tải xuống + lưu lịch sử
const incrementDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const docId = parseInt(id);

    const doc = await prisma.document.findUnique({ where: { id: docId }, select: { id: true } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    const [updatedDoc] = await Promise.all([
      prisma.document.update({
        where: { id: docId },
        data: { download_count: { increment: 1 } },
      }),
      prisma.downloadHistory.create({ data: { user_id: userId, document_id: docId } })
    ]);

    res.json({ message: "Đã tăng lượt tải", download_count: updatedDoc.download_count });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [POST] Tăng lượt xem
const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { view_count: { increment: 1 } }, // Tự động cộng 1 vào DB
    });
    res.json({ message: "Đã tăng lượt xem", view_count: updatedDoc.view_count });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [GET] Lấy danh sách bình luận của 1 tài liệu
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { document_id: parseInt(id) },
      include: { 
        user: { select: { id: true, name: true, avatar_url: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tải bình luận" });
  }
};

// [POST] Đăng bình luận mới
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || !content.trim()) return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    if (content.trim().length > 500) return res.status(400).json({ message: "Bình luận không được quá 500 ký tự" });

    // Kiểm tra tài liệu tồn tại và chưa bị xóa
    const docCheck = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { id: true, deleted_at: true } });
    if (!docCheck || docCheck.deleted_at) return res.status(404).json({ message: "Tài liệu không tồn tại" });

    const newComment = await prisma.comment.create({
      data: {
        content: content.trim(),
        document_id: parseInt(id),
        user_id: userId
      },
      include: { 
        user: { select: { id: true, name: true, avatar_url: true } } 
      }
    });

    res.status(201).json({ message: "Đã bình luận", comment: newComment });

    // Gửi notification cho chủ tài liệu (nếu không phải tự bình luận tài liệu của mình)
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true } });
    if (doc && doc.user_id !== userId) {
      const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      prisma.notification.create({
        data: {
          user_id: doc.user_id,
          content: `💬 ${commenter.name} đã bình luận vào tài liệu "${doc.title}"`,
          link: `/documents/${id}`
        }
      }).catch(() => {});
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// [GET] Dành cho Admin: Lấy các tài liệu đang chờ duyệt
const getPendingDocuments = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });
    const documents = await prisma.document.findMany({
      where: { status: 'PENDING', deleted_at: null },
      include: { category: true, user: { select: { name: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [PUT] Dành cho Admin: Duyệt tài liệu
const approveDocument = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });
    const { id } = req.params;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status: 'APPROVED', reject_reason: null }
    });

    // Gửi thông báo — không để lỗi này block response
    prisma.notification.create({
      data: { user_id: doc.user_id, content: `✅ Tài liệu "${doc.title}" của bạn đã được duyệt!`, link: `/documents/${id}` }
    }).catch(err => console.error('Notification error:', err));

    res.json({ message: "Đã duyệt tài liệu!", document: updatedDoc });
  } catch (error) {
    console.error('approveDocument error:', error);
    res.status(500).json({ message: "Lỗi khi duyệt", error: error.message });
  }
};

// [PUT] Dành cho Admin: Từ chối tài liệu kèm lý do
const rejectDocument = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status: 'REJECTED', reject_reason: reason.trim() }
    });

    prisma.notification.create({
      data: { user_id: doc.user_id, content: `❌ Tài liệu "${doc.title}" bị từ chối. Lý do: ${reason.trim()}`, link: `/my-documents` }
    }).catch(err => console.error('Notification error:', err));

    res.json({ message: "Đã từ chối tài liệu!", document: updatedDoc });
  } catch (error) {
    console.error('rejectDocument error:', error);
    res.status(500).json({ message: "Lỗi khi từ chối", error: error.message });
  }
};

// [POST] Lưu hoặc Bỏ lưu tài liệu (Toggle)
const toggleSaveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Kiểm tra xem đã lưu chưa
    const existingSave = await prisma.savedDocument.findUnique({
      where: {
        user_id_document_id: { user_id: userId, document_id: parseInt(id) }
      }
    });

    if (existingSave) {
      // Nếu đã lưu rồi -> Xóa khỏi danh sách lưu
      await prisma.savedDocument.delete({
        where: { user_id_document_id: { user_id: userId, document_id: parseInt(id) } }
      });
      res.json({ message: "Đã bỏ lưu", isSaved: false });
    } else {
      // Nếu chưa lưu -> Thêm vào danh sách lưu
      await prisma.savedDocument.create({
        data: { user_id: userId, document_id: parseInt(id) }
      });
      res.json({ message: "Đã lưu tài liệu", isSaved: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// [GET] Lấy danh sách tài liệu đã lưu của người dùng
const getSavedDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const savedDocs = await prisma.savedDocument.findMany({
      where: { user_id: userId },
      include: {
        document: {
          include: { category: true, user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { saved_at: 'desc' }
    });
    res.json(savedDocs.map(item => item.document).filter(doc => doc && !doc.deleted_at));
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [POST] Đánh giá tài liệu (1-5 sao)
const rateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const userId = req.user.userId;

    if (!score || score < 1 || score > 5) return res.status(400).json({ message: "Điểm đánh giá phải từ 1 đến 5" });

    await prisma.rating.upsert({
      where: { user_id_document_id: { user_id: userId, document_id: parseInt(id) } },
      update: { score: parseInt(score) },
      create: { user_id: userId, document_id: parseInt(id), score: parseInt(score) }
    });

    // Tính lại điểm trung bình
    const agg = await prisma.rating.aggregate({
      where: { document_id: parseInt(id) },
      _avg: { score: true },
      _count: { score: true }
    });

    res.json({ avgScore: agg._avg.score, totalRatings: agg._count.score, userScore: parseInt(score) });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Lịch sử tải xuống của user
const getDownloadHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.downloadHistory.findMany({
        where: { user_id: userId },
        include: {
          document: {
            include: { category: { select: { name: true } } },
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.downloadHistory.count({ where: { user_id: userId } })
    ]);

    res.json({ history, pagination: { total, page, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [DELETE] Xóa 1 mục lịch sử tải xuống
const deleteDownloadHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { historyId } = req.params;
    const item = await prisma.downloadHistory.findUnique({ where: { id: parseInt(historyId) } });
    if (!item) return res.status(404).json({ message: "Không tìm thấy" });
    if (item.user_id !== userId) return res.status(403).json({ message: "Không có quyền" });
    await prisma.downloadHistory.delete({ where: { id: parseInt(historyId) } });
    res.json({ message: "Đã xóa" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [DELETE] Xóa toàn bộ lịch sử tải xuống
const clearDownloadHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.downloadHistory.deleteMany({ where: { user_id: userId } });
    res.json({ message: "Đã xóa toàn bộ lịch sử" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Lấy tài liệu công khai của 1 user theo userId
const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const [user, documents] = await Promise.all([
      prisma.user.findUnique({ where: { id: parseInt(userId) }, select: { id: true, name: true, avatar_url: true, created_at: true } }),
      prisma.document.findMany({
        where: { user_id: parseInt(userId), status: 'APPROVED', deleted_at: null },
        include: { category: true },
        orderBy: { created_at: 'desc' }
      })
    ]);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ user, documents });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Lấy tài liệu của user hiện tại (bao gồm cả PENDING)
const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const documents = await prisma.document.findMany({
      where: { user_id: userId, deleted_at: null },
      include: { category: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [DELETE] Xóa bình luận (chủ bình luận hoặc admin)
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await prisma.comment.findUnique({ where: { id: parseInt(commentId) } });
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận" });

    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (comment.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    await prisma.comment.delete({ where: { id: parseInt(commentId) } });
    res.json({ message: "Đã xóa bình luận" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

module.exports = { 
  uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, getUserDocuments, updateDocument,
  deleteDocument, restoreDocument, permanentDeleteDocument, getTrashDocuments,
  incrementDownload, incrementView, getDownloadHistory, deleteDownloadHistory, clearDownloadHistory,
  getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument, rejectDocument,
  toggleSaveDocument, getSavedDocuments,
  rateDocument
};
