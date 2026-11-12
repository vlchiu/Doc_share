const errors = {
  LIMIT_FILE_SIZE: [400, 'File vượt quá giới hạn dung lượng cho phép.'],
  LIMIT_UNEXPECTED_FILE: [400, 'Trường file không hợp lệ hoặc chọn quá nhiều file.'],
  INVALID_FILE_TYPE: [400, 'Loại file không được hỗ trợ.'],
  INVALID_AVATAR_TYPE: [400, 'Ảnh đại diện phải là JPG, PNG hoặc GIF.'],
  UPLOAD_LENGTH_REQUIRED: [411, 'Chưa xác định được kích thước tải lên. Vui lòng thử lại.'],
  STORAGE_QUOTA_EXCEEDED: [413, 'Dung lượng tài khoản không đủ cho tệp mới.'],
  STORAGE_UNVERIFIED: [409, 'Cần đối soát kích thước tài liệu cũ trước khi tải thêm.'],
  QUOTA_CONFIG: [503, 'Cấu hình hạn mức chưa hợp lệ. Vui lòng thử lại sau.'],
};
module.exports = function uploadError(error, req, res, next) {
  if (!error || res.headersSent) return next(error);
  const known = errors[error.code];
  if (known) return res.status(known[0]).json({ code: error.code, message: known[1] });
  console.error('Upload failed:', error.code || error.name);
  return res.status(503).json({ code: 'UPLOAD_UNAVAILABLE', message: 'Chưa thể tải file lên. Vui lòng thử lại sau.' });
};
