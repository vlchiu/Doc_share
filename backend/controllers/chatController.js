const prisma = require('../db');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Cache nội dung tài liệu (TTL 15 phút)
const docContentCache = new Map();

// Helper: parse PDF buffer (hỗ trợ cả pdf-parse v1 & v2)
async function parsePdfBuffer(buffer) {
  try {
    const pdfParseModule = require('pdf-parse');
    if (typeof pdfParseModule === 'function') {
      const res = await pdfParseModule(buffer);
      return res.text || '';
    } else if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
      await parser.load();
      const res = await parser.getText();
      return (typeof res === 'object' ? res?.text : res) || '';
    }
  } catch (err) {
    console.error('Lỗi phân tích PDF:', err.message);
  }
  return '';
}

// Helper: Lấy Buffer file từ đĩa cục bộ hoặc URL
async function getFileBuffer(fileUrl) {
  if (!fileUrl) return null;

  // 1. File cục bộ trên máy chủ
  if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
    const cleanPath = fileUrl.replace(/^\/+/, '');
    const localPath = path.isAbsolute(fileUrl) ? fileUrl : path.join(__dirname, '..', cleanPath);
    if (fs.existsSync(localPath)) {
      return fs.promises.readFile(localPath);
    }
    const uploadsPath = path.join(__dirname, '../uploads', path.basename(fileUrl));
    if (fs.existsSync(uploadsPath)) {
      return fs.promises.readFile(uploadsPath);
    }
  }

  // 2. File từ URL bên ngoài (Cloudinary, ngrok, v.v.)
  try {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    return Buffer.from(response.data);
  } catch (err) {
    console.error('Lỗi tải file:', err.message);
    return null;
  }
}

// ── Extract text từ tài liệu ──────────────────────────────────────────────────
async function extractDocumentText(doc) {
  const cacheKey = `${doc.id}`;
  if (docContentCache.has(cacheKey)) return docContentCache.get(cacheKey);

  let text = '';
  try {
    const buffer = await getFileBuffer(doc.file_url);
    if (buffer) {
      const fileType = (doc.file_type || '').toLowerCase();
      const fileUrl = (doc.file_url || '').toLowerCase();

      if (fileType.includes('pdf') || fileUrl.endsWith('.pdf')) {
        text = await parsePdfBuffer(buffer);
      } else if (
        fileType.includes('word') ||
        fileType.includes('officedocument') ||
        fileUrl.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
      } else if (
        fileType.startsWith('text/') ||
        ['.txt', '.md', '.json', '.csv', '.cpp', '.c', '.js', '.py', '.html', '.xml', '.java'].some(ext => fileUrl.endsWith(ext))
      ) {
        text = buffer.toString('utf8');
      }
    }
  } catch (err) {
    console.error('Extract text error:', err.message);
  }

  // Giới hạn độ dài để tối ưu payload (30.000 ký tự)
  const trimmed = (text || '').slice(0, 30000).trim();
  docContentCache.set(cacheKey, trimmed);
  setTimeout(() => docContentCache.delete(cacheKey), 15 * 60 * 1000);
  return trimmed;
}

// ── Gọi Gemini API với cơ chế tự động thử model dự phòng ──────────────────────
async function callGemini(systemPrompt, history, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  // Danh sách model ưu tiên theo độ khả dụng và tốc độ phản hồi
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];

  // Chuẩn hóa lịch sử hội thoại cho Gemini: user -> model luân phiên, bắt đầu bằng user
  const sanitizedHistory = [];
  let lastRole = null;

  for (const h of history.slice(-10)) {
    const role = h.role === 'assistant' ? 'model' : 'user';
    const text = typeof h.content === 'string' ? h.content.trim() : '';
    if (!text) continue;

    if (sanitizedHistory.length === 0 && role !== 'user') {
      continue;
    }

    if (role === lastRole) {
      sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n${text}`;
    } else {
      sanitizedHistory.push({
        role,
        parts: [{ text }]
      });
      lastRole = role;
    }
  }

  let lastError = null;
  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: sanitizedHistory,
      });

      const result = await chat.sendMessage(userMessage);
      const reply = result.response.text();
      if (reply) return { reply, modelUsed: modelName };
    } catch (err) {
      console.warn(`Gemini model ${modelName} thất bại:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả model Gemini đều không phản hồi');
}

// ── Fallback gọi Groq (nếu máy chủ cấu hình GROQ_API_KEY) ────────────────────
async function callGroq(systemPrompt, history, userMessage) {
  if (!process.env.GROQ_API_KEY) throw new Error('NO_GROQ_KEY');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  return {
    reply: response.data.choices?.[0]?.message?.content || 'Không có phản hồi',
    modelUsed: 'llama-3.3-70b-versatile'
  };
}

// ── [POST] /api/chat/:docId ───────────────────────────────────────────────────
const chatWithDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }

    const docIdNum = parseInt(docId);
    if (isNaN(docIdNum)) {
      return res.status(400).json({ message: 'Mã tài liệu không hợp lệ' });
    }

    // Lấy thông tin tài liệu
    const doc = await prisma.document.findUnique({
      where: { id: docIdNum },
      include: {
        user: { select: { name: true } },
        category: { select: { name: true } }
      }
    });

    if (!doc) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu này' });
    }

    // Thời gian hiện tại Việt Nam
    const now = new Date();
    const currentDateTime = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Trích xuất nội dung văn bản từ file tài liệu
    const docText = await extractDocumentText(doc);

    // System prompt chuyên sâu
    const systemPrompt = `Bạn là DocShare AI Copilot - Trợ lý trí tuệ nhân tạo chuyên biệt trên nền tảng DocShare.
Nhiệm vụ của bạn là hỗ trợ người dùng đọc hiểu, tóm tắt, phân tích và giải đáp mọi thắc mắc liên quan đến tài liệu đang xem.

THÔNG TIN TÀI LIỆU ĐANG XEM:
- Tiêu đề: ${doc.title}
- Danh mục: ${doc.category?.name || 'Tài liệu chung'}
- Tác giả chia sẻ: ${doc.user?.name || 'Ẩn danh'}
- Loại tài liệu: ${doc.doc_type || 'Tài liệu'}
- Mô tả tóm tắt: ${doc.description || 'Không có mô tả'}
${docText ? `\nNỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ FILE:\n"""\n${docText}\n"""` : '\n(Không thể đọc trực tiếp nội dung chi tiết từ định dạng file này, hãy trả lời dựa trên tiêu đề, mô tả và kiến thức liên quan).'}

NGUYÊN TẮC TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt tự nhiên, súc tích, chuyên nghiệp và có chiều sâu.
2. Trình bày bằng Markdown đẹp mắt: sử dụng tiêu đề nhỏ, in đậm, danh sách bullet hoặc bảng biểu khi cần.
3. Nếu người dùng yêu cầu tóm tắt tài liệu: tóm lược ngắn gọn các ý chính, khái niệm cốt lõi và kết luận thực tiễn.
4. Thời gian hiện tại tại Việt Nam: ${currentDateTime}.`;

    let result = null;

    // 1. Ưu tiên Gemini API
    if (process.env.GEMINI_API_KEY) {
      try {
        result = await callGemini(systemPrompt, history, message.trim());
      } catch (geminiErr) {
        console.error('Lỗi Gemini Copilot:', geminiErr.message);
      }
    }

    // 2. Dự phòng Groq API
    if (!result && process.env.GROQ_API_KEY) {
      try {
        result = await callGroq(systemPrompt, history, message.trim());
      } catch (groqErr) {
        console.error('Lỗi Groq Copilot:', groqErr.message);
      }
    }

    if (!result) {
      return res.status(500).json({
        message: 'AI Copilot hiện không thể phản hồi. Vui lòng kiểm tra GEMINI_API_KEY trên máy chủ backend.'
      });
    }

    res.json({
      reply: result.reply,
      modelUsed: result.modelUsed,
      docTitle: doc.title
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      message: 'Lỗi máy chủ khi xử lý câu hỏi AI. Vui lòng thử lại sau.'
    });
  }
};

module.exports = { chatWithDocument };

