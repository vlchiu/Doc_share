export const FILE_ICONS = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-excel': '📗',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
  'application/vnd.ms-powerpoint': '📙',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📙',
  'text/plain': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'application/zip': '🗜️',
  'application/x-rar-compressed': '🗜️',
  'application/xml': '📋',
  'text/xml': '📋',
};

export const FILE_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'application/zip': 'ZIP',
  'application/x-rar-compressed': 'RAR',
  'application/xml': 'XML',
  'text/xml': 'XML',
};

export const FILE_BADGE_COLORS = {
  'PDF':  { bg: '#fee2e2', color: '#b91c1c' },
  'DOC':  { bg: '#dbeafe', color: '#1d4ed8' },
  'DOCX': { bg: '#dbeafe', color: '#1d4ed8' },
  'XLS':  { bg: '#dcfce7', color: '#15803d' },
  'XLSX': { bg: '#dcfce7', color: '#15803d' },
  'PPT':  { bg: '#ffedd5', color: '#c2410c' },
  'PPTX': { bg: '#ffedd5', color: '#c2410c' },
  'TXT':  { bg: '#f1f5f9', color: '#475569' },
  'JPG':  { bg: '#fdf4ff', color: '#7e22ce' },
  'PNG':  { bg: '#fdf4ff', color: '#7e22ce' },
  'GIF':  { bg: '#fdf4ff', color: '#7e22ce' },
  'ZIP':  { bg: '#fef9c3', color: '#a16207' },
  'RAR':  { bg: '#fef9c3', color: '#a16207' },
  'XML':  { bg: '#ecfdf5', color: '#065f46' },
};

export function getFileLabel(mimeType, fileUrl) {
  if (FILE_LABELS[mimeType]) return FILE_LABELS[mimeType];
  // fallback: lấy extension từ tên file
  const ext = fileUrl?.split('.').pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : 'FILE';
}

// Các loại file trình duyệt có thể hiển thị trực tiếp
const PREVIEWABLE_TYPES = [
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export function openOrDownload(fileUrl, fileType, fileName, onDownload) {
  if (PREVIEWABLE_TYPES.includes(fileType)) {
    window.open(fileUrl, '_blank');
  } else {
    const ext = fileName?.split('.').pop()?.toUpperCase() || 'file này';
    const yes = window.confirm(
      `Trình duyệt không thể xem trực tiếp file ${ext}.\nBạn có muốn tải xuống để mở không?`
    );
    if (yes && onDownload) onDownload();
  }
}
