const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../db');
const axios = require('axios');
const pdfParse = require('pdf-parse');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache nội dung tài liệu
const docContentCache = new Map();

// ── Extract text từ tài liệu ──────────────────────────────────────────────────
async function extractDocumentText(doc) {
  const cacheKey = `${doc.id}`;
  if (docContentCache.has(cacheKey)) return docContentCache.get(cacheKey);

  const fileUrl = doc.file_url?.startsWith('http')
    ? doc.file_url
    : `${process.env.BACKEND_URL}${doc.file_url}`;

  let text = '';
  try {
    if (doc.file_type === 'application/pdf') {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const pdfData = await pdfParse(Buffer.from(response.data));
      text = pdfData.text?.slice(0, 25000) || '';
    } else if (doc.file_type === 'text/plain') {
      const response = await axios.get(fileUrl, { timeout: 10000 });
      text = String(response.data).slice(0, 25000);
    }
  } catch (err) {
    console.error('Extract text error:', err.message);
  }

  docContentCache.set(cacheKey, text);
  setTimeout(() => docContentCache.delete(cacheKey), 10 * 60 * 1000);
  return text;
}

// ── Gọi Gemini qua REST API trực tiếp ────────────────────────────────────────
async function callGemini(contents) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.8,
    }
  }, { timeout: 30000 });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi';
}

// ── [POST] /api/chat/:docId ───────────────────────────────────────────────────
const chatWithDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }

    // Lấy thông tin tài liệu (nếu có)
    let docContext = '';
    try {
      const doc = await prisma.document.findUnique({
        where: { id: parseInt(docId) },
        include: { user: { select: { name: true } }, category: true }
      });

      if (doc) {
        const docText = await extractDocumentText(doc);
        docContext = `
THÔNG TIN TÀI LIỆU ĐANG XEM:
- Tiêu đề: ${doc.title}
- Mô tả: ${doc.description || 'Không có'}
- Danh mục: ${doc.category?.name || ''}
- Loại: ${doc.doc_type}
- Tác giả: ${doc.user?.name}
- Loại file: ${doc.file_type}
${docText ? `\nNỘI DUNG TÀI LIỆU:\n${docText}` : '\n(Không thể đọc nội dung file này)'}
`;
      }
    } catch {}

    // System prompt — Gemini tổng quát + có thêm context tài liệu nếu có
    const systemPrompt = `Bạn là trợ lý AI thông minh tích hợp trong DocShare - nền tảng chia sẻ tài liệu.
Bạn có thể trả lời MỌI câu hỏi như một AI tổng quát (giống ChatGPT/Gemini).
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu và hữu ích.
${docContext ? `\nNgoài ra, người dùng đang xem tài liệu sau, bạn có thể hỗ trợ về tài liệu này nếu được hỏi:\n${docContext}` : ''}`;

    // Build contents cho REST API
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Xin chào! Tôi là trợ lý AI của DocShare. Tôi có thể giúp bạn về tài liệu này hoặc trả lời bất kỳ câu hỏi nào khác. Bạn cần hỗ trợ gì?' }] },
      // Thêm history (10 tin nhắn gần nhất)
      ...history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: message.trim() }] }
    ];

    const reply = await callGemini(contents);

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ message: 'Lỗi AI: ' + error.message });
  }
};

module.exports = { chatWithDocument };
