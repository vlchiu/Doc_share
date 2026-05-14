const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../db');
const axios = require('axios');
const pdfParse = require('pdf-parse');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache nội dung tài liệu để không fetch lại nhiều lần
const docContentCache = new Map();

// ── Lấy nội dung text từ tài liệu ────────────────────────────────────────────
async function extractDocumentText(doc) {
  const cacheKey = `${doc.id}_${doc.file_url}`;
  if (docContentCache.has(cacheKey)) return docContentCache.get(cacheKey);

  const fileUrl = doc.file_url.startsWith('http')
    ? doc.file_url
    : `${process.env.BACKEND_URL}${doc.file_url}`;

  let text = '';

  try {
    if (doc.file_type === 'application/pdf') {
      // Tải PDF và extract text
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const pdfData = await pdfParse(Buffer.from(response.data));
      text = pdfData.text?.slice(0, 30000) || ''; // Giới hạn 30k ký tự
    } else if (doc.file_type === 'text/plain') {
      const response = await axios.get(fileUrl, { timeout: 10000 });
      text = String(response.data).slice(0, 30000);
    } else if (
      doc.file_type === 'application/msword' ||
      doc.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // DOCX: chỉ báo AI biết là file Word, không extract được
      text = `[Đây là file Word: ${doc.title}. Không thể đọc nội dung trực tiếp, nhưng tôi có thể trả lời dựa trên tiêu đề và mô tả.]`;
    } else {
      text = `[File ${doc.file_type}: ${doc.title}]`;
    }
  } catch (err) {
    console.error('Extract text error:', err.message);
    text = `[Không thể đọc nội dung file: ${doc.title}]`;
  }

  // Cache 10 phút
  docContentCache.set(cacheKey, text);
  setTimeout(() => docContentCache.delete(cacheKey), 10 * 60 * 1000);

  return text;
}

// ── [POST] /api/chat/:docId ───────────────────────────────────────────────────
const chatWithDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }

    // Lấy thông tin tài liệu
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(docId) },
      include: { user: { select: { name: true } }, category: true }
    });

    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    if (doc.status !== 'APPROVED') return res.status(403).json({ message: 'Tài liệu chưa được duyệt' });

    // Extract nội dung tài liệu
    const docText = await extractDocumentText(doc);

    // Tạo system prompt
    const systemPrompt = `Bạn là trợ lý AI thông minh giúp người dùng hiểu nội dung tài liệu trên DocShare.

THÔNG TIN TÀI LIỆU:
- Tiêu đề: ${doc.title}
- Mô tả: ${doc.description || 'Không có mô tả'}
- Danh mục: ${doc.category?.name || 'Không rõ'}
- Loại: ${doc.doc_type}
- Tác giả: ${doc.user?.name}
- Loại file: ${doc.file_type}

NỘI DUNG TÀI LIỆU:
${docText || 'Không thể đọc nội dung file này.'}

HƯỚNG DẪN:
- Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu
- Chỉ trả lời dựa trên nội dung tài liệu trên
- Nếu câu hỏi không liên quan đến tài liệu, hãy nhắc nhở người dùng
- Nếu không tìm thấy thông tin trong tài liệu, hãy nói rõ
- Có thể tóm tắt, giải thích, dịch thuật nội dung trong tài liệu`;

    // Khởi tạo model Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Chuyển history sang format Gemini
    const chatHistory = history.slice(-10).map(h => ({ // Giữ 10 tin nhắn gần nhất
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    // Bắt đầu chat session
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Tôi đã đọc tài liệu và sẵn sàng trả lời câu hỏi của bạn!' }] },
        ...chatHistory
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessage(message.trim());
    const response = result.response.text();

    res.json({ reply: response });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({ message: 'Lỗi cấu hình AI' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { chatWithDocument };
