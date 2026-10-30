// Buffer handler output so a timed-out provider cannot send a late response.
const CHAT_TIMEOUT_MS = 45000;
function withChatDeadline(handler, timeoutMs = CHAT_TIMEOUT_MS) {
  return async (req, res) => {
    const controller = new AbortController();
    let timer;
    let status = 200, payload;
    const buffered = {status(code) {status=code;return this;},json(data) {payload=data;return this;}};
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Object.assign(new Error('Chat deadline exceeded'), {code:'CHAT_TIMEOUT'}));
        }, timeoutMs);
      });
      await Promise.race([handler({...req, signal:controller.signal}, buffered), deadline]);
      if (controller.signal.aborted) throw Object.assign(new Error('Chat deadline exceeded'), {code:'CHAT_TIMEOUT'});
      return res.status(status).json(payload);
    } catch (error) {
      if (controller.signal.aborted || error.code === 'CHAT_TIMEOUT') {
        return res.status(504).json({code:'CHAT_TIMEOUT',message:'AI phản hồi quá lâu. Câu hỏi chưa được lưu; vui lòng thử lại.'});
      }
      return res.status(503).json({message:'Chưa thể xử lý câu hỏi AI. Vui lòng thử lại.'});
    } finally {clearTimeout(timer);}
  };
}
module.exports = {withChatDeadline, CHAT_TIMEOUT_MS};
