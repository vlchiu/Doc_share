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
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
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

// ── Tra cứu thời tiết trực tiếp thời gian thực (Open-Meteo API) ───────────────
const CITY_COORDS = {
  'hà nội': { lat: 21.0285, lon: 105.8542, name: 'Hà Nội' },
  'ha noi': { lat: 21.0285, lon: 105.8542, name: 'Hà Nội' },
  'hồ chí minh': { lat: 10.8231, lon: 106.6297, name: 'TP. Hồ Chí Minh' },
  'ho chi minh': { lat: 10.8231, lon: 106.6297, name: 'TP. Hồ Chí Minh' },
  'sài gòn': { lat: 10.8231, lon: 106.6297, name: 'TP. Hồ Chí Minh' },
  'sai gon': { lat: 10.8231, lon: 106.6297, name: 'TP. Hồ Chí Minh' },
  'đà nẵng': { lat: 16.0544, lon: 108.2022, name: 'Đà Nẵng' },
  'da nang': { lat: 16.0544, lon: 108.2022, name: 'Đà Nẵng' },
  'hải phòng': { lat: 20.8449, lon: 106.6881, name: 'Hải Phòng' },
  'cần thơ': { lat: 10.0452, lon: 105.7469, name: 'Cần Thơ' },
  'nha trang': { lat: 12.2388, lon: 109.1967, name: 'Nha Trang' },
  'đà lạt': { lat: 11.9404, lon: 108.4583, name: 'Đà Lạt' },
  'huế': { lat: 16.4637, lon: 107.5909, name: 'Huế' },
  'vũng tàu': { lat: 10.3460, lon: 107.0843, name: 'Vũng Tàu' },
  'quảng ninh': { lat: 20.9505, lon: 107.0734, name: 'Quảng Ninh' },
  'hạ long': { lat: 20.9505, lon: 107.0734, name: 'Hạ Long' },
  'vinh': { lat: 18.6734, lon: 105.6813, name: 'Vinh' },
  'nam định': { lat: 20.4344, lon: 106.1804, name: 'Nam Định' }
};

const WEATHER_CODES = {
  0: 'Trời quang đãng, nắng đẹp',
  1: 'Chủ yếu quang đãng',
  2: 'Có mây rải rác',
  3: 'Nhiều mây u ám',
  45: 'Có sương mù',
  48: 'Sương mù dày',
  51: 'Mưa phùn nhẹ',
  53: 'Mưa phùn vừa',
  55: 'Mưa phùn nặng hạt',
  61: 'Mưa nhỏ',
  63: 'Mưa rào vừa',
  65: 'Mưa to nặng hạt',
  80: 'Mưa rào từng cơn',
  81: 'Mưa rào rải rác',
  82: 'Mưa rào rất to',
  95: 'Có dông sét',
  96: 'Dông có mưa đá nhẹ',
  99: 'Dông bão mạnh kèm mưa đá'
};

async function fetchLiveWeather(query) {
  const lower = query.toLowerCase();
  const isWeather = /thời tiết|nhiệt độ|trời mưa|trời nắng|mưa không|dự báo thời tiết|weather|temperature|cảm giác như/i.test(lower);
  if (!isWeather) return null;

  let target = null;
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) {
      target = coords;
      break;
    }
  }

  // Nếu không thấy trong danh sách mẫu, thử geocoding qua Open-Meteo hoặc mặc định Hà Nội
  if (!target) {
    const match = lower.match(/(ở|tại|vùng|khu vực|in|at)\s+([a-zA-ZÀ-ỹ\s]+)/i);
    if (match && match[2]) {
      const cityName = match[2].trim().split(/\s+/).slice(0, 3).join(' ');
      try {
        const geoRes = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=vi&format=json`,
          { timeout: 3500 }
        );
        const geo = geoRes.data?.results?.[0];
        if (geo) {
          target = { lat: geo.latitude, lon: geo.longitude, name: geo.name };
        }
      } catch {}
    }
    if (!target) target = CITY_COORDS['hà nội'];
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const res = await axios.get(url, { timeout: 4500 });
    const c = res.data.current;
    const desc = WEATHER_CODES[c.weather_code] || 'Thời tiết bình thường';
    return `DỮ LIỆU THỜI TIẾT TRỰC TIẾP THỜI GIAN THỰC (TỪ TRẠM KHÍ TƯỢNG VỆ TINH):
- Địa điểm: ${target.name}
- Tình trạng: ${desc}
- Nhiệt độ thực tế: ${c.temperature_2m}°C
- Cảm giác thực tế như: ${c.apparent_temperature}°C
- Độ ẩm không khí: ${c.relative_humidity_2m}%
- Tốc độ gió: ${c.wind_speed_10m} km/h
- Lượng mưa hiện tại: ${c.precipitation} mm`;
  } catch (err) {
    console.error('Lỗi lấy dữ liệu thời tiết:', err.message);
    return null;
  }
}

// ── Tra cứu bách khoa / kiến thức trực tiếp (Wikipedia API) ───────────────────
async function fetchLiveKnowledge(query) {
  const lower = query.toLowerCase();
  const isDocSpecific = /tài liệu này|file này|đoạn code này|tác giả này|trong file|tóm tắt tài liệu/i.test(lower);
  if (isDocSpecific) return null;

  const isSearchIntent = /ai là|là ai|là gì|ở đâu|khi nào|lịch sử|sự kiện|tiểu sử|nguồn gốc|định nghĩa|thủ đô|dân số|quốc gia|công ty|tập đoàn/i.test(lower);
  if (!isSearchIntent) return null;

  try {
    const cleanQuery = query
      .replace(/cho tôi biết|bạn có biết|là gì|như thế nào|tìm kiếm|tra cứu|giải thích/gi, '')
      .trim();
    if (!cleanQuery || cleanQuery.length < 2) return null;

    const res = await axios.get(
      `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`,
      {
        headers: { 'User-Agent': 'DocShareAI/1.0 (contact@docshare.vn)' },
        timeout: 3500
      }
    );

    const items = res.data?.query?.search;
    if (items && items.length > 0) {
      const snippets = items.slice(0, 3).map((item, idx) => {
        const text = item.snippet.replace(/<[^>]+>/g, '');
        return `${idx + 1}. **${item.title}**: ${text}`;
      }).join('\n');
      return `DỮ LIỆU BÁCH KHOA VÀ THỰC TẾ TRỰC TIẾP TỪ INTERNET:\n${snippets}`;
    }
  } catch (err) {
    // Silent fail
  }
  return null;
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

    // 1. Trích xuất văn bản tài liệu song song với tìm kiếm dữ liệu thời gian thực
    const [docText, liveWeather, liveKnowledge] = await Promise.all([
      extractDocumentText(doc),
      fetchLiveWeather(message.trim()),
      fetchLiveKnowledge(message.trim()),
    ]);

    let liveDataSection = '';
    if (liveWeather) liveDataSection += `\n${liveWeather}\n`;
    if (liveKnowledge) liveDataSection += `\n${liveKnowledge}\n`;

    // System prompt toàn năng kết nối dữ liệu thời gian thực
    const systemPrompt = `Bạn là DocShare AI Copilot - Trợ lý trí tuệ nhân tạo chuyên biệt trên nền tảng DocShare.
Bạn có khả năng giải đáp mọi câu hỏi của người dùng: từ đọc hiểu, tóm tắt, phân tích tài liệu đang xem cho đến các câu hỏi thực tế ngoài đời sống (thời gian, thời tiết, sự kiện, khoa học, lập trình).

THÔNG TIN THỜI GIAN HỆ THỐNG:
- Hiện tại: ${currentDateTime} (Giờ Việt Nam - GMT+7).

THÔNG TIN TÀI LIỆU ĐANG XEM:
- Tiêu đề: ${doc.title}
- Danh mục: ${doc.category?.name || 'Tài liệu chung'}
- Tác giả chia sẻ: ${doc.user?.name || 'Ẩn danh'}
- Loại tài liệu: ${doc.doc_type || 'Tài liệu'}
- Mô tả tóm tắt: ${doc.description || 'Không có mô tả'}
${docText ? `\nNỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ FILE:\n"""\n${docText}\n"""` : '\n(Không có nội dung văn bản chi tiết từ file này, hãy trả lời dựa trên thông tin mô tả và kiến thức liên quan).'}
${liveDataSection ? `\nTHÔNG TIN TRA CỨU TRỰC TIẾP THỜI GIAN THỰC:\n${liveDataSection}` : ''}

NGUYÊN TẮC TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt tự nhiên, nhiệt tình, lịch sự, chuyên nghiệp.
2. Trình bày bằng Markdown đẹp mắt: dùng tiêu đề nhỏ (###), in đậm (**), bullet list (*), icon trực quan khi nói về thời gian/thời tiết.
3. KHI NGƯỜI DÙNG HỎI VỀ THỜI GIAN, NGÀY THÁNG HOẶC THỜI TIẾT:
   - Hãy sử dụng NGAY các số liệu thời gian và thời tiết thời gian thực được cung cấp ở trên để trả lời chính xác, rõ ràng và đầy đủ (gồm nhiệt độ thực tế, cảm giác nhiệt độ, độ ẩm, tình trạng nắng/mưa/gió).
   - Tuyệt đối KHÔNG từ chối hoặc nói rằng mình "không có kết nối internet/trạm khí tượng". Hệ thống đã kết nối dữ liệu sẵn cho bạn!
4. KHI NGƯỜI DÙNG HỎI VỀ TÀI LIỆU: Ưu tiên trả lời sát với nội dung trích xuất từ tài liệu đang xem.`;

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

