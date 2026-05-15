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
    if (data.answer) searchContext += `Tóm tắt: ${data.answer}\n\n`;
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

// ── Dùng AI để quyết định có cần search không và tạo query tối ưu ─────────────
async function decideSearchQuery(message, currentDateTime) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Bạn là bộ phân tích câu hỏi. Thời gian hiện tại: ${currentDateTime}.
Nhiệm vụ: Xác định xem câu hỏi có cần tìm kiếm web để trả lời chính xác không.
Cần search khi: hỏi về thời tiết, tin tức, giá cả, sự kiện hiện tại, thông tin mới nhất, ngày giờ cụ thể, kết quả thể thao, v.v.
KHÔNG cần search khi: hỏi về kiến thức chung, lập trình, toán học, giải thích khái niệm, hỏi về tài liệu đang xem.
Trả lời JSON: {"needSearch": true/false, "searchQuery": "câu query tối ưu bằng tiếng Anh nếu cần search, null nếu không"}
Chỉ trả về JSON, không giải thích thêm.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 100,
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '{}';
    // Lấy JSON từ response (đôi khi có text thừa)
    const jsonMatch = content.match(/\{.*\}/s);
    if (!jsonMatch) return { needSearch: false, searchQuery: null };
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Decide search error:', err.message);
    return { needSearch: false, searchQuery: null };
  }
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

    // Thời gian hiện tại Việt Nam
    const now = new Date();
    const currentDateTime = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // 1. Lấy context tài liệu và quyết định search — chạy song song
    const [docResult, searchDecision] = await Promise.all([
      // Lấy context tài liệu
      (async () => {
        try {
          const doc = await prisma.document.findUnique({
            where: { id: parseInt(docId) },
            include: { user: { select: { name: true } }, category: true },
          });
          if (!doc) return '';
          const docText = await extractDocumentText(doc);
          return `
THÔNG TIN TÀI LIỆU ĐANG XEM:
- Tiêu đề: ${doc.title}
- Mô tả: ${doc.description || 'Không có'}
- Danh mục: ${doc.category?.name || ''}
- Loại: ${doc.doc_type}
- Tác giả: ${doc.user?.name}
- Loại file: ${doc.file_type}
${docText ? `\nNỘI DUNG TÀI LIỆU:\n${docText}` : '\n(Không thể đọc nội dung file này)'}
`;
        } catch { return ''; }
      })(),
      // AI quyết định có cần search không
      decideSearchQuery(message.trim(), currentDateTime),
    ]);

    const docContext = docResult;

    // 2. Thực hiện web search nếu AI quyết định cần
    let searchContext = '';
    if (searchDecision.needSearch && searchDecision.searchQuery) {
      console.log(`🔍 AI decided to search: "${searchDecision.searchQuery}"`);
      const results = await webSearch(searchDecision.searchQuery);
      if (results) {
        searchContext = `\nKẾT QUẢ TÌM KIẾM WEB (cập nhật mới nhất):\n${results}`;
      }
    }

    // 3. Build system prompt
    const systemPrompt = `Bạn là trợ lý AI thông minh tích hợp trong DocShare - nền tảng chia sẻ tài liệu.
Bạn có thể trả lời MỌI câu hỏi: lập trình, khoa học, lịch sử, tin tức, thời tiết, thể thao, đời sống, v.v.
Trả lời bằng tiếng Việt, rõ ràng, chi tiết và hữu ích.
Nếu có kết quả web search, ưu tiên dùng thông tin đó và đề cập nguồn.
THỜI GIAN HIỆN TẠI (Việt Nam): ${currentDateTime}
${docContext ? `\nNgười dùng đang xem tài liệu sau, hỗ trợ về tài liệu này nếu được hỏi:\n${docContext}` : ''}
${searchContext}`;

    // 4. Gọi Groq sinh câu trả lời
    const reply = await callGroq(systemPrompt, history, message.trim());

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi AI: ' + (error.response?.data?.error?.message || error.message) });
  }
};

module.exports = { chatWithDocument };
