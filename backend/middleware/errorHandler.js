// Never serialize provider/Prisma errors, request bodies, URLs or credentials.
module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error('Unhandled request error:', error.code || error.name);
  const status = Number(error.status || error.statusCode);
  if (status === 413) return res.status(413).json({ message: 'Dữ liệu gửi lên vượt quá giới hạn cho phép.' });
  if (Number.isInteger(status) && status >= 400 && status < 500) return res.status(status).json({ message: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra dữ liệu và thử lại.' });
  return res.status(500).json({ message: 'Có lỗi máy chủ. Vui lòng thử lại sau.' });
};
