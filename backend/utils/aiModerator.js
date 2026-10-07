const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Tên model Gemini đúng — đã kiểm tra với API (10/2026)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',   // ✅ Chính — nhanh, rẻ
  'gemini-2.0-flash',        // ✅ Backup 1
  'gemini-2.0-flash-lite',   // ✅ Backup 2 (bị deprecated → redirect tự động)
];

/**
 * Dùng AI kiểm duyệt nội dung tài liệu
 * @returns {{ verdict: 'APPROVE'|'PENDING'|'REJECT', reason: string, confidence: number }}
 */
async function moderateDocument({ title, description, docType, fileType, textContent }) {
  if (!process.env.GEMINI_API_KEY) {
    return { verdict: 'PENDING', reason: 'AI chưa được cấu hình', confidence: 0 };
  }

  const contentSummary = [
    `Tiêu đề: ${title}`,
    description ? `Mô tả: ${description}` : '',
    `Loại tài liệu: ${docType}`,
    `Định dạng file: ${fileType}`,
    textContent ? `Nội dung (trích đoạn):\n${textContent.slice(0, 3000)}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Bạn là hệ thống kiểm duyệt nội dung tự động cho nền tảng chia sẻ tài liệu học thuật/kỹ thuật nội bộ.

Nhiệm vụ: Phân tích tài liệu dưới đây và đưa ra quyết định kiểm duyệt.

THÔNG TIN TÀI LIỆU:
${contentSummary}

TIÊU CHÍ ĐÁNH GIÁ:
- APPROVE: Tài liệu phù hợp (học thuật, kỹ thuật, báo cáo, hướng dẫn, code, tài liệu công việc)
- PENDING: Nội dung không rõ ràng, cần admin xem xét thêm
- REJECT: Tài liệu vi phạm (nội dung người lớn, bạo lực, quảng cáo spam, thông tin cá nhân nhạy cảm, vi phạm bản quyền rõ ràng)

Hãy trả lời ĐÚNG theo định dạng JSON sau, KHÔNG có text thêm:
{
  "verdict": "APPROVE" | "PENDING" | "REJECT",
  "reason": "Lý do ngắn gọn bằng tiếng Việt (tối đa 100 ký tự)",
  "confidence": 0.0 - 1.0
}`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Extract JSON từ response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      if (['APPROVE', 'PENDING', 'REJECT'].includes(parsed.verdict)) {
        console.log(`✅ AI Moderation [${modelName}]: ${parsed.verdict} - ${parsed.reason}`);
        return {
          verdict: parsed.verdict,
          reason: parsed.reason || '',
          confidence: parseFloat(parsed.confidence) || 0.8,
          model: modelName,
        };
      }
    } catch (err) {
      console.warn(`AI Moderation model ${modelName} failed:`, err.message);
    }
  }

  // Fallback nếu tất cả model fail
  return { verdict: 'PENDING', reason: 'AI không thể phân tích, cần admin xem xét', confidence: 0 };
}

module.exports = { moderateDocument };
