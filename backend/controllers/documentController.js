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

    const newDoc = await prisma.document.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        file_url: `/uploads/${file.filename}`,
        file_type: file.mimetype,
        category_id: parseInt(category_id),
        user_id: userId,
        doc_type: doc_type || "Chung"
      }
    });

    res.status(201).json({ message: "Tải lên thành công chờ duyệt!", document: newDoc });
  } catch (error) {
    // Xử lý lỗi từ multer (file quá lớn, sai loại)
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

    const [doc, savedRecord] = await Promise.all([
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
      }) : Promise.resolve(null)
    ]);

    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    res.json({ ...doc, isSaved: !!savedRecord });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Lấy tất cả tài liệu (Chỉ lấy tài liệu ĐÃ DUYỆT) - có pagination
const getAllDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const where = { status: 'APPROVED' };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
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
// [DELETE] Xóa tài liệu
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. Tìm tài liệu và thông tin người dùng đang thao tác
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } });
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

    // 2. Kiểm tra quyền: Chỉ được xóa nếu là chủ nhân HOẶC là ADMIN
    if (doc.user_id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này" });
    }

    // 3. Xóa file vật lý trong ổ cứng (Dọn rác)
    const fs = require('fs');
    const path = require('path');
    if (doc.file_url) {
      const filePath = path.join(__dirname, '..', doc.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // 4. Xóa sạch các dữ liệu liên quan (Bình luận, Lượt lưu) trước khi xóa tài liệu
    await prisma.comment.deleteMany({ where: { document_id: parseInt(id) } });
    await prisma.savedDocument.deleteMany({ where: { document_id: parseInt(id) } });

    // 5. Cuối cùng: Xóa tài liệu khỏi Database
    await prisma.document.delete({ where: { id: parseInt(id) } });

    res.json({ message: "Đã xóa tài liệu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi xóa", error: error.message });
  }
};

// [POST] Tăng lượt tải xuống
const incrementDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { download_count: { increment: 1 } }, // Tự động cộng 1 vào DB
    });
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
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// [GET] Dành cho Admin: Lấy các tài liệu đang chờ duyệt
const getPendingDocuments = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền truy cập" });
    const documents = await prisma.document.findMany({
      where: { status: 'PENDING' },
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
    const updatedDoc = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status: 'APPROVED' }
    });
    res.json({ message: "Đã duyệt tài liệu!", document: updatedDoc });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi duyệt" });
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
          include: { category: true, user: { select: { name: true } } }
        }
      },
      orderBy: { saved_at: 'desc' }
    });
    // Trích xuất mảng document từ kết quả của bảng trung gian
    res.json(savedDocs.map(item => item.document));
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [GET] Lấy tài liệu của user hiện tại (bao gồm cả PENDING)
const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const documents = await prisma.document.findMany({
      where: { user_id: userId },
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
  uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, updateDocument, deleteDocument, 
  incrementDownload, incrementView, getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument,
  toggleSaveDocument, getSavedDocuments
};
