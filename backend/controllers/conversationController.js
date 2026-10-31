const prisma = require('../db');
const { randomUUID } = require('node:crypto');
const { canReadDocument } = require('../utils/documentAccess');
const { chatGeneral, chatWithDocument } = require('./chatController');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = { id: true, title: true, document_id: true, created_at: true, updated_at: true };
const fail = (status, message) => Object.assign(new Error(message), { status });
const endpoint = handler => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (!error.status) console.error('Conversation error:', error.code || error.name);
    res.status(error.status || 503).json({ message: error.status ? error.message : 'Chưa thể lưu hoặc tải hội thoại. Vui lòng thử lại.' });
  }
};
function positive(value, fallback) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw fail(400, 'Tham số phân trang không hợp lệ.');
  return Number(value);
}
async function owned(req, db = prisma, read = true) {
  if (!UUID.test(req.params.id || '')) throw fail(400, 'Mã hội thoại không hợp lệ.');
  const conversation = await db.conversation.findFirst({ where: { id: req.params.id, user_id: req.user.userId } });
  if (!conversation) throw fail(404, 'Không tìm thấy hội thoại.');
  if (read && conversation.document_id) {
    const document = await db.document.findUnique({ where: { id: conversation.document_id } });
    if (!canReadDocument(document, req.user)) throw fail(403, 'Bạn không còn quyền truy cập tài liệu của hội thoại này.');
  }
  return conversation;
}
// The existing AI handlers remain the single implementation of prompts/providers.
async function generate(req, conversation, message, history) {
  let status = 200, payload;
  const output = { status(code) { status = code; return this; }, json(data) { payload = data; return this; } };
  const input = { user: req.user, params: { docId: String(conversation.document_id) }, body: { message, history } };
  await (conversation.document_id ? chatWithDocument : chatGeneral)(input, output);
  if (status === 504) throw fail(504, payload.message);
  if (status !== 200 || typeof payload?.reply !== 'string' || !payload.reply.trim()) throw fail(502, 'AI chưa thể trả lời. Câu hỏi chưa được lưu; hãy thử lại.');
  if (payload.reply.length > 64000) throw fail(502, 'Câu trả lời quá dài. Hãy yêu cầu AI trả lời ngắn hơn.');
  return payload.reply;
}
exports.list = endpoint(async (req, res) => {
  const page = positive(req.query.page, 1);
  const search = req.query.search ?? '';
  if(typeof search !== 'string' || search.length > 120) throw fail(400, 'Từ khóa tìm kiếm tối đa 120 ký tự.');
  if (page > 10000) throw fail(400, 'Trang vượt giới hạn.');
  const rows = await prisma.conversation.findMany({ where: { user_id: req.user.userId, ...(search.trim() ? {title:{contains:search.trim(),mode:"insensitive"}} : {}) }, select: fields,
    orderBy: [{ updated_at: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 31 });
  res.json({ conversations: rows.slice(0, 30), hasMore: rows.length > 30 });
});
exports.create = endpoint(async (req, res) => {
  const body = req.body || {};
  const documentId = body.documentId == null ? null : positive(body.documentId);
  if (documentId) {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!canReadDocument(document, req.user)) throw fail(403, 'Bạn không có quyền truy cập tài liệu này.');
  }
  const title = typeof body.title === 'string' ? body.title.trim() : 'Hội thoại mới';
  if (!title || title.length > 120) throw fail(400, 'Tiêu đề cần từ 1 đến 120 ký tự.');
  const conversation = await prisma.conversation.create({ data: { user_id: req.user.userId, document_id: documentId, title }, select: fields });
  res.status(201).json(conversation);
});
exports.messages = endpoint(async (req, res) => {
  const conversation = await owned(req);
  const before = positive(req.query.before, undefined);
  const rows = await prisma.chatMessage.findMany({ where: { conversation_id: conversation.id, ...(before ? { id: { lt: before } } : {}) }, orderBy: { id: 'desc' }, take: 51 });
  res.json({ conversation: Object.fromEntries(Object.keys(fields).map(key => [key, conversation[key]])), messages: rows.slice(0, 50).reverse(), hasMore: rows.length > 50 });
});
exports.rename = endpoint(async (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) throw fail(400, 'Tiêu đề cần từ 1 đến 120 ký tự.');
  await owned(req, prisma, false);
  const result = await prisma.conversation.updateMany({ where: { id: req.params.id, user_id: req.user.userId }, data: { title: title.trim() } });
  if (!result.count) throw fail(404, 'Không tìm thấy hội thoại.');
  res.json({ title: title.trim() });
});
exports.remove = endpoint(async (req, res) => {
  await owned(req, prisma, false);
  await prisma.conversation.deleteMany({ where: { id: req.params.id, user_id: req.user.userId } });
  res.json({ message: 'Đã xóa hội thoại.' });
});
exports.send = endpoint(async (req, res) => {
  const { message, requestId } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 8000 || !UUID.test(requestId || '')) throw fail(400, 'Câu hỏi hoặc mã gửi không hợp lệ.');
  const conversation = await owned(req);
  const previous = await prisma.chatMessage.findMany({ where: { conversation_id: conversation.id, request_id: requestId }, orderBy: { id: 'asc' } });
  if (previous.length) {
    if (previous.find(row => row.role === 'user')?.content !== message.trim()) throw fail(409, 'Mã gửi đã được dùng cho câu hỏi khác.');
    return res.json({ messages: previous });
  }
  const token = randomUUID();
  const locked = await prisma.conversation.updateMany({ where: { id: conversation.id, user_id: req.user.userId,
    OR: [{ busy_until: null }, { busy_until: { lt: new Date() } }] }, data: { busy_token: token, busy_until: new Date(Date.now() + 10 * 60 * 1000) } });
  if (!locked.count) throw fail(409, 'Hội thoại đang xử lý câu hỏi khác. Hãy chờ rồi thử lại.');
  try {
    // Recheck after taking the lock: a concurrent retry may just have completed.
    const replay = await prisma.chatMessage.findMany({ where: { conversation_id: conversation.id, request_id: requestId }, orderBy: { id: 'asc' } });
    if (replay.length) {
      if (replay.find(row => row.role === 'user')?.content !== message.trim()) throw fail(409, 'Mã gửi đã được dùng cho câu hỏi khác.');
      return res.json({ messages: replay });
    }
    const recent = await prisma.chatMessage.findMany({ where: { conversation_id: conversation.id }, orderBy: { id: 'desc' }, take: 10 });
    const reply = await generate(req, conversation, message.trim(), recent.reverse().map(row => ({ role: row.role, content: row.content.slice(0, 16000) })));
    const messages = await prisma.$transaction(async tx => {
      // Never recreate a deleted conversation or write after losing the lock/access.
      await owned(req, tx);
      const updated = await tx.conversation.updateMany({ where: { id: conversation.id, user_id: req.user.userId, busy_token: token }, data: { updated_at: new Date(), busy_token: null, busy_until: null } });
      if (!updated.count) throw fail(409, 'Hội thoại đã thay đổi. Hãy tải lại trước khi gửi tiếp.');
      const question = await tx.chatMessage.create({ data: { conversation_id: conversation.id, request_id: requestId, role: 'user', content: message.trim() } });
      const answer = await tx.chatMessage.create({ data: { conversation_id: conversation.id, request_id: requestId, role: 'assistant', content: reply } });
      return [question, answer];
    });
    res.json({ messages });
  } finally {
    try {
      await prisma.conversation.updateMany({ where: { id: conversation.id, busy_token: token }, data: { busy_token: null, busy_until: null } });
    } catch (error) {
      // The lease expires if the database is temporarily unavailable. Do not send twice.
      console.error('Conversation unlock failed:', error.code || error.name);
    }
  }
});
