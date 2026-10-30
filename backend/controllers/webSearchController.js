const { AbortController } = globalThis;
const tavily = require('../services/tavily.service');
const { summarize } = require('../services/aiSummary.service');
const cache = new Map();

function validateInput(body) {
  const { query, category = 'all', limit = 10 } = body || {};
  if (typeof query !== 'string' || !query.trim() || query.length > 500 ||
      !['all', 'news'].includes(category) || !Number.isInteger(limit) || limit < 1 || limit > 10) return null;
  return { query: query.trim().replace(/\s+/g, ' '), category, limit };
}
async function webSearch(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const input = validateInput(req.body);
  if (!input) return res.status(400).json({ code: 'INVALID_SEARCH', message: 'Nhập câu hỏi từ 1–500 ký tự, bộ lọc hợp lệ và giới hạn từ 1–10.' });
  const key = JSON.stringify([req.user.userId, input]);
  const now = Date.now();
  for (const [entry, value] of cache) if (value.expires <= now) cache.delete(entry);
  const cached = cache.get(key);
  if (cached) return res.json(cached.data);
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onClose);
  try {
    const sources = await tavily.search(input, controller.signal);
    const summary = await summarize(input.query, sources, controller.signal);
    if (controller.signal.aborted) return;
    const data = { success: true, ...input, ...summary, sources, total: sources.length };
    if (summary.summaryStatus !== 'unavailable') {
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { expires: Date.now() + 60000, data });
    }
    return res.json(data);
  } catch (error) {
    if (controller.signal.aborted) return;
    const timeout = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
    const unavailable = error.code === 'SEARCH_NOT_CONFIGURED' || [401, 403, 429, 432, 433].includes(error.response?.status);
    return res.status(timeout ? 504 : unavailable ? 503 : 502).json({
      code: timeout ? 'SEARCH_TIMEOUT' : 'SEARCH_UNAVAILABLE',
      message: timeout ? 'Tìm kiếm mất quá nhiều thời gian. Vui lòng thử lại.' : 'Dịch vụ tìm kiếm tạm thời không khả dụng. Vui lòng thử lại sau.',
    });
  } finally { res.removeListener('close', onClose); }
}
module.exports = { webSearch, validateInput };
