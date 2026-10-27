// backend/controllers/documentController.js
const prisma = require('../db');
const fs = require('fs');
const { sourceForDocument, deleteStoredFile } = require('../utils/documentStorage');
const { canReadDocument, readableWhere, publicDocument } = require('../utils/documentAccess');
const { moderateDocument } = require('../utils/aiModerator');

// ── Helper: generate thumbnail URL ───────────────────────────────────────────
function generateThumbnailUrl(fileUrl, mimeType) {
  if (!fileUrl || fileUrl.includes('/authenticated/')) return null;

  try {
    if (mimeType.startsWith('image/')) {
      // Ảnh — dùng trực tiếp, thêm Cloudinary transformation nếu là Cloudinary URL
      if (fileUrl.includes('cloudinary.com')) {
        return fileUrl.replace('/image/upload/', '/image/upload/w_400,h_280,c_fill,q_80/');
      }
      return fileUrl;
    }

    // PDF, DOCX, v.v. — không generate thumbnail được trên free tier
    return null;
  } catch {
    return null;
  }
}

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

    // Cloudinary trả về secure_url trong path hoặc secure_url
    const fileUrl = req.file.secure_url || req.file.path;

    // Generate thumbnail URL
    const thumbnailUrl = generateThumbnailUrl(fileUrl, req.file.mimetype);

    const newDoc = await prisma.document.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        file_url: fileUrl,
        file_type: req.file.mimetype,
        thumbnail_url: thumbnailUrl,
        category_id: parseInt(category_id),
        user_id: userId,
        doc_type: validDocType
      }
    });

    res.status(201).json({ message: "Tải lên thành công chờ duyệt!", document: publicDocument(newDoc) });

    // ── AI Kiểm duyệt tự động (chạy background, không block response) ─────────
    (async () => {
      try {
        // Extract text từ file để AI phân tích nội dung
        let textContent = '';
        try {
          const axiosLib = require('axios');
          const fileUrl = sourceForDocument(newDoc).url;
          const mime = newDoc.file_type;

          if (mime === 'application/pdf' && fileUrl?.startsWith('http')) {
            // PDF → hỗ trợ cả pdf-parse v1 và v2
            const pdfParseModule = require('pdf-parse');
            const resp = await axiosLib.get(fileUrl, { responseType: 'arraybuffer', timeout: 20000 });
            const buf = Buffer.from(resp.data);
            if (typeof pdfParseModule === 'function') {
              const pdfData = await pdfParseModule(buf);
              textContent = (pdfData.text || '').slice(0, 3000);
            } else if (pdfParseModule.PDFParse) {
              const parser = new pdfParseModule.PDFParse(new Uint8Array(buf));
              await parser.load();
              const parsedRes = await parser.getText();
              const rawText = (typeof parsedRes === 'object' ? parsedRes?.text : parsedRes) || '';
              textContent = rawText.slice(0, 3000);
            }

          } else if (
            (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             mime === 'application/msword') &&
            fileUrl?.startsWith('http')
          ) {
            // DOCX / DOC → mammoth
            const mammoth = require('mammoth');
            const resp = await axiosLib.get(fileUrl, { responseType: 'arraybuffer', timeout: 20000 });
            const result = await mammoth.extractRawText({ buffer: Buffer.from(resp.data) });
            textContent = (result.value || '').slice(0, 3000);

          } else if (mime === 'text/plain' && fileUrl?.startsWith('http')) {
            // TXT → đọc trực tiếp
            const resp = await axiosLib.get(fileUrl, { responseType: 'text', timeout: 10000 });
            textContent = (resp.data || '').slice(0, 3000);
          }
        } catch (extractErr) {
          console.warn('Text extraction skipped:', extractErr.message);
        }

        const modResult = await moderateDocument({
          title: newDoc.title,
          description: newDoc.description,
          docType: newDoc.doc_type,
          fileType: newDoc.file_type,
          textContent,
        });

        // Cập nhật kết quả AI vào DB
        const updateData = {
          ai_moderation_result: JSON.stringify(modResult),
        };

        const hasTextContent = textContent && textContent.length > 100;
        if (modResult.verdict === 'APPROVE' && modResult.confidence >= 0.92 && hasTextContent) updateData.status = 'APPROVED';
        if (modResult.verdict === 'REJECT' && modResult.confidence >= 0.9) {
          updateData.status = 'REJECTED';
          updateData.reject_reason = `[AI Kiểm duyệt] ${modResult.reason}`;
        }
        const applied = await prisma.document.updateMany({
          where: { id: newDoc.id, content_version: newDoc.content_version, status: 'PENDING', deleted_at: null, removed_by_admin: false },
          data: updateData,
        });
        if (applied.count && updateData.status) {
          prisma.notification.create({ data: {
            user_id: userId,
            content: `AI kiểm duyệt tài liệu "${newDoc.title}": ${updateData.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}. ${modResult.reason || ''}`,
            link: '/my-documents',
          } }).catch(() => {});
        }
      } catch (err) {
        console.error('AI moderation error:', err.message);
      }
    })();

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
    if (req.file) await deleteStoredFile(req.file.secure_url || req.file.path).catch(() => {});
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "File quá lớn! Giới hạn tối đa là 20MB." });
    }
    console.error('uploadDocument error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Lấy chi tiết 1 tài liệu theo ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const docId = parseInt(id);
    if (isNaN(docId) || docId < 1) return res.status(400).json({ message: "ID không hợp lệ" });

    const userId = req.user?.userId || null;

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

    if (!canReadDocument(doc, req.user)) return res.status(404).json({ message: 'Tài liệu không tồn tại hoặc không có quyền xem.' });

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
      ...publicDocument(doc),
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
      removed_by_admin: false,
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
          user: { select: { id: true, name: true } }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      documents: documents.map(publicDocument),
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
    if ((doc.user_id !== userId || doc.removed_by_admin) && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền sửa tài liệu này" });
    }

    if (doc.removed_by_admin && currentUser.role !== 'ADMIN') return res.status(403).json({ message: 'Tài liệu đã bị quản trị viên gỡ.' });
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 200)) return res.status(400).json({ message: 'Tên tài liệu không hợp lệ.' });
    const updateData = { status: 'PENDING', reject_reason: null, ai_moderation_result: null, content_version: { increment: 1 } };
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category_id !== undefined) updateData.category_id = parseInt(category_id);
    if (file) {
      const fileUrl = file.secure_url || file.path;
      updateData.file_url = fileUrl;
      updateData.file_type = file.mimetype;
      updateData.thumbnail_url = generateThumbnailUrl(fileUrl, file.mimetype);
    }

    const changed = await prisma.document.updateMany({
      where: { id: doc.id, content_version: doc.content_version, deleted_at: null, removed_by_admin: false },
      data: updateData
    });
    if (!changed.count) return res.status(409).json({ message: 'Tài liệu đã thay đổi. Vui lòng tải lại trang.' });
    const updatedDoc = await prisma.document.findUnique({ where: { id: doc.id } });

    res.status(200).json({ message: "Cập nhật thành công!", document: publicDocument(updatedDoc) });
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

    if ((doc.user_id !== userId || doc.removed_by_admin) && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này" });
    }

    await prisma.document.update({
      where: { id: parseInt(id) },
      data: { deleted_at: new Date(), content_version: { increment: 1 } }
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
    if ((doc.user_id !== userId || doc.removed_by_admin) && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền khôi phục tài liệu này" });
    }

    if (doc.removed_by_admin && currentUser.role !== 'ADMIN') return res.status(403).json({ message: 'Chỉ quản trị viên được khôi phục tài liệu đã bị gỡ.' });
    await prisma.document.update({
      where: { id: parseInt(id) },
      data: { deleted_at: null, ...(doc.removed_by_admin ? { removed_by_admin: false, status: 'PENDING', content_version: { increment: 1 } } : {}) }
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
    if ((doc.user_id !== userId || doc.removed_by_admin) && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này" });
    }

    const stored = sourceForDocument(doc);
    await prisma.$transaction(async tx => {
      const document_id = doc.id;
      await tx.comment.deleteMany({ where: { document_id } });
      await tx.savedDocument.deleteMany({ where: { document_id } });
      await tx.downloadHistory.deleteMany({ where: { document_id } });
      await tx.rating.deleteMany({ where: { document_id } });
      await tx.report.deleteMany({ where: { document_id } });
      await tx.document.delete({ where: { id: document_id } });
    });
    try {
      if (stored.url) await deleteStoredFile(doc.file_url);
      else if (fs.existsSync(stored.path)) await fs.promises.unlink(stored.path);
    } catch (error) {
      console.error('Storage cleanup required for deleted document:', doc.id, error.code || error.name);
    }

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
    res.json(docs.map(publicDocument));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
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
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true, deleted_at: true, removed_by_admin: true, content_version: true } });
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
    res.json(documents.map(publicDocument));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [PUT] Dành cho Admin: Duyệt tài liệu
const approveDocument = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });
    const { id } = req.params;

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true, deleted_at: true, removed_by_admin: true, content_version: true } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    if (doc.deleted_at || doc.removed_by_admin) return res.status(409).json({ message: 'Hãy khôi phục tài liệu trước khi kiểm duyệt.' });

    const expectedVersion = req.body.contentVersion;
    if (!Number.isInteger(expectedVersion) || expectedVersion !== doc.content_version) return res.status(409).json({ message: 'Tài liệu đã thay đổi. Vui lòng tải lại danh sách trước khi duyệt.' });
    const changed = await prisma.document.updateMany({
      where: { id: parseInt(id), content_version: expectedVersion, deleted_at: null, removed_by_admin: false },
      data: { status: 'APPROVED', reject_reason: null, content_version: { increment: 1 } }
    });
    if (!changed.count) return res.status(409).json({ message: 'Tài liệu vừa thay đổi. Hãy tải lại danh sách.' });
    const updatedDoc = await prisma.document.findUnique({ where: { id: parseInt(id) } });

    // Gửi thông báo — không để lỗi này block response
    prisma.notification.create({
      data: { user_id: doc.user_id, content: `✅ Tài liệu "${doc.title}" của bạn đã được duyệt!`, link: `/documents/${id}` }
    }).catch(err => console.error('Notification error:', err));

    res.json({ message: "Đã duyệt tài liệu!", document: publicDocument(updatedDoc) });
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

    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) }, select: { user_id: true, title: true, deleted_at: true, removed_by_admin: true, content_version: true } });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    if (doc.deleted_at || doc.removed_by_admin) return res.status(409).json({ message: 'Hãy khôi phục tài liệu trước khi kiểm duyệt.' });

    const expectedVersion = req.body.contentVersion;
    if (!Number.isInteger(expectedVersion) || expectedVersion !== doc.content_version) return res.status(409).json({ message: 'Tài liệu đã thay đổi. Vui lòng tải lại danh sách trước khi duyệt.' });
    const changed = await prisma.document.updateMany({
      where: { id: parseInt(id), content_version: expectedVersion, deleted_at: null, removed_by_admin: false },
      data: { status: 'REJECTED', reject_reason: reason.trim(), content_version: { increment: 1 } }
    });
    if (!changed.count) return res.status(409).json({ message: 'Tài liệu vừa thay đổi. Hãy tải lại danh sách.' });
    const updatedDoc = await prisma.document.findUnique({ where: { id: parseInt(id) } });

    prisma.notification.create({
      data: { user_id: doc.user_id, content: `❌ Tài liệu "${doc.title}" bị từ chối. Lý do: ${reason.trim()}`, link: `/my-documents` }
    }).catch(err => console.error('Notification error:', err));

    res.json({ message: "Đã từ chối tài liệu!", document: publicDocument(updatedDoc) });
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
      where: { user_id: userId, document: readableWhere(req.user) },
      include: {
        document: {
          include: { category: true, user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { saved_at: 'desc' }
    });
    res.json(savedDocs.map(item => publicDocument(item.document)));
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

    res.json({ history: history.map(item => ({ ...item, document: canReadDocument(item.document, req.user) ? publicDocument(item.document) : null })), pagination: { total, page, totalPages: Math.ceil(total / limit) } });
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
        where: { user_id: parseInt(userId), status: 'APPROVED', deleted_at: null, removed_by_admin: false },
        include: { category: true },
        orderBy: { created_at: 'desc' }
      })
    ]);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ user, documents: documents.map(publicDocument) });
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
    res.json(documents.map(publicDocument));
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
  incrementView, getDownloadHistory, deleteDownloadHistory, clearDownloadHistory,
  getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument, rejectDocument,
  toggleSaveDocument, getSavedDocuments,
  rateDocument
};
