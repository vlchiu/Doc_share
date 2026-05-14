const prisma = require('../db');
const axios = require('axios');
const pdfParse = require('pdf-parse');

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

// ── Tavily Web Search ─────────────────────────────────────────────────────────
async function webSearch(query) {
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      },
      { timeout: 10000 }
    );

    const data = response.data;
    let searchContext = '';

    // Dùng answer tổng hợp nếu có
    if (data.answer) {
      searchContext += `Tóm tắt: ${data.answer}\n\n`;
    }

    // Thêm các kết quả chi tiết
    if (data.results?.length) {
      searchContext += 'Nguồn tham khảo:\n';
      data.results.slice(0, 4).forEach((r, i) => {
        searchContext += `${i + 1}. ${r.title}\n   ${r.content?.slice(0, 300)}...\n   URL: ${r.url}\n\n`;
      });
    }

    return searchContext;
  } catch (err) {
    console.error('Tavily search error:', err.message);
    return null;
  }
}

// ── Kiểm tra xem câu hỏi có cần web search không ─────────────────────────────
function needsWebSearch(message) {
  const keywords = [
    // Thời gian thực
    'hôm nay', 'hôm qua', 'ngày mai', 'tuần này', 'tháng này', 'năm nay',
    'hiện tại', 'hiện nay', 'mới nhất', 'gần đây', 'vừa', 'đang',
    'bây giờ', 'lúc này',
    // Thời tiết
    'thời tiết', 'nhiệt độ', 'mưa', 'nắng', 'bão', 'lũ', 'dự báo',
    // Tin tức
    'tin tức', 'tin mới', 'sự kiện', 'xảy ra', 'vụ', 'scandal',
    'bầu cử', 'chiến tranh', 'dịch bệnh', 'covid', 'kinh tế',
    // Giá cả / tài chính
    'giá', 'tỷ giá', 'bitcoin', 'crypto', 'chứng khoán', 'vàng', 'đô',
    'lãi suất', 'lạm phát',
    // Thể thao
    'kết quả', 'tỷ số', 'bóng đá', 'world cup', 'sea games', 'olympic',
    // Công nghệ mới
    'iphone', 'samsung', 'ra mắt', 'phát hành', 'update', 'version mới',
    // Tiếng Anh
    'today', 'yesterday', 'tomorrow', 'latest', 'current', 'now',
    'weather', 'news', 'price', 'stock', 'score',
  ];

  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ── Gọi Groq API ─────────────────────────────────────────────────────────────
async function callGroq(systemPrompt, history, userMessage) {
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
      timeout: 30000,
    }
  );

  return response.data.choices?.[0]?.message?.content || 'Không có phản hồi';
}

// ── [POST] /api/chat/:docId ───────────────────────────────────────────────────
const chatWithDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
    }

    // 1. Lấy context tài liệu (nếu có)
    let docContext = '';
    try {
      const doc = await prisma.document.findUnique({
        where: { id: parseInt(docId) },
        include: { user: { select: { name: true } }, category: true },
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

    // 2. Web search nếu cần
    let searchContext = '';
    if (needsWebSearch(message)) {
      console.log(`🔍 Web search for: "${message}"`);
      const results = await webSearch(message);
      if (results) {
        searchContext = `\nKẾT QUẢ TÌM KIẾM WEB (cập nhật mới nhất):\n${results}`;
      }
    }

    // 3. Build system prompt
    const systemPrompt = `Bạn là trợ lý AI thông minh tích hợp trong DocShare - nền tảng chia sẻ tài liệu.
Bạn có thể trả lời MỌI câu hỏi: lập trình, khoa học, lịch sử, tin tức, thời tiết, thể thao, v.v.
Trả lời bằng tiếng Việt, rõ ràng, hữu ích. Nếu có kết quả web search, hãy dùng thông tin đó để trả lời chính xác.
Khi trích dẫn thông tin từ web, hãy đề cập nguồn.
${docContext ? `\nNgười dùng đang xem tài liệu sau, hỗ trợ về tài liệu này nếu được hỏi:\n${docContext}` : ''}
${searchContext}`;

    // 4. Gọi Groq
    const reply = await callGroq(systemPrompt, history, message.trim());

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi AI: ' + (error.response?.data?.error?.message || error.message) });
  }
};

module.exports = { chatWithDocument };
