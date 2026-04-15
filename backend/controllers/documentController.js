// backend/controllers/documentController.js
const prisma = require('../db');
const fs = require('fs'); // Thư viện xử lý file (MỚI)
const path = require('path'); // Thư viện xử lý đường dẫn (MỚI)

// [POST] Tải tài liệu lên
const uploadDocument = async (req, res) => {
  try {
    const { title, description, category_id, doc_type } = req.body; // Thêm doc_type ở đây
    const file = req.file;
    const userId = req.user.userId; 

    if (!file) return res.status(400).json({ message: "Vui lòng chọn file" });

    const newDoc = await prisma.document.create({
      data: {
        title,
        description,
        file_url: `/uploads/${file.filename}`,
        file_type: file.mimetype,
        category_id: parseInt(category_id),
        user_id: userId,
        doc_type: doc_type || "Chung" // Lưu vào DB
      }
    });

    res.status(201).json({ message: "Tải lên thành công chờ duyệt!", document: newDoc });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Lấy tất cả tài liệu (Chỉ lấy tài liệu ĐÃ DUYỆT)
const getAllDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { status: 'APPROVED' }, // THÊM DÒNG NÀY
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


// [PUT] Cập nhật thông tin tài liệu (Sửa tên, mô tả, danh mục hoặc Đổi File)
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id } = req.body;
    const file = req.file; // Nhận file mới từ Frontend (nếu có)

    // 1. Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = parseInt(category_id);

    // 2. Nếu người dùng up file mới để thay thế
    if (file) {
      updateData.file_url = `/uploads/${file.filename}`;
      updateData.file_type = file.mimetype;
      
      // ĐÃ BỎ ĐOẠN CODE XÓA FILE CŨ Ở ĐÂY!
      // File cũ vẫn sẽ nằm an toàn trong thư mục uploads.
    }

    // 3. Lưu vào Database
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
        user: { select: { name: true, avatar_url: true } } // Lấy kèm tên và avatar người bình luận
      },
      orderBy: { created_at: 'desc' } // Mới nhất xếp trên cùng
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
    const userId = req.user.userId; // Lấy ID từ token người đăng nhập

    const newComment = await prisma.comment.create({
      data: {
        content: content,
        document_id: parseInt(id),
        user_id: userId
      },
      include: { 
        user: { select: { name: true, avatar_url: true } } 
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

// ĐỪNG QUÊN CẬP NHẬT DÒNG CUỐI CÙNG NHÉ:
module.exports = { 
  uploadDocument, getAllDocuments, updateDocument, deleteDocument, 
  incrementDownload, incrementView, getComments, addComment,
  getPendingDocuments, approveDocument,
  toggleSaveDocument, getSavedDocuments // THÊM 2 HÀM NÀY
};
