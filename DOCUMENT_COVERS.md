# Ảnh bìa riêng và cải thiện AI Chat

## Dùng ảnh bìa

Mở chi tiết tài liệu của bạn → **Quản lý ảnh bìa tài liệu** → chọn JPG, PNG hoặc WebP (tối đa 5 MB) → **Lưu ảnh bìa**. Quản trị viên cũng có thể cập nhật. Tài liệu chuyển về PENDING và tăng content_version để được duyệt lại; kết quả kiểm duyệt cũ bị xóa. Gỡ ảnh bìa không công bố nội dung mới, giữ trạng thái tài liệu hiện tại.

Đây là ảnh do người đăng chọn riêng, dùng được với mọi loại tài liệu. Không tự trích trang PDF/Word và không tự sinh ảnh cho tài liệu cũ. Nếu chưa có bìa hoặc bìa lỗi, thẻ dùng fallback theo định dạng.

## Lưu trữ và bảo vệ

- Dùng `thumbnail_url` đang có, không migration database.
- Dependency production mới: sharp (package-lock được cập nhật). Cài dependencies khi triển khai backend, không chỉ chép file JS. Sharp đã chạy thực tế trong kiểm thử chuẩn hóa ảnh trên môi trường hiện tại.
- Multer memory upload tối đa 5 MB/1 tệp; sharp chỉ nhận dữ liệu JPEG/PNG/WebP, giới hạn 25 triệu pixel và 2 tác vụ chuẩn hóa đồng thời; xuất WebP tối đa 600×400, tối đa 512 KB, bỏ metadata và không chuyển động. SVG không được chấp nhận.
- Lưu asset riêng trong Cloudinary `docshare-covers/<uuid>`, resource image, delivery authenticated. Dùng cấu hình Cloudinary hiện có; không đổi quyền tệp gốc.
- API chỉ công bố đường dẫn nội bộ `/api/documents/thumbnail/:id?v=...`, không công bố URL Cloudinary. Proxy ký URL phía server, không redirect, chỉ nhận bytes WebP và kiểm tra lại quyền trước khi gửi; Cache-Control private/no-store.
- Tài liệu APPROVED cho xem bìa công khai. Bản chờ duyệt chỉ chủ tài liệu/admin xem. Tài liệu bị xóa/gỡ không xem được. Frontend lấy Blob bằng axios (JWT header khi đăng nhập), lazy load theo vùng nhìn thấy và hủy/revoke object URL khi rời component.
- Xem bìa không gọi proxy-file/download, không tăng lượt tải hoặc trừ quota. Giới hạn đọc 240 request/phút/IP, upload 15/phút/IP.
- Đổi bìa/dọn bìa cũ, thay tệp gốc hoặc xóa vĩnh viễn sẽ thử xóa asset bìa cũ. Xung đột phiên bản dọn asset vừa upload. Khi phản hồi DB không rõ đã commit hay chưa, chỉ dọn khi xác định asset không được tham chiếu; có thể còn orphan nếu DB/storage lỗi, cần vận hành kiểm tra sau. Không hứa xóa ngay bản cache/backup ngoài hệ thống.

## API

- GET `/api/documents/thumbnail/:id`: optional JWT + documentAccess, trả image/webp.
- POST `/api/documents/:id/cover`: JWT + quyền quản lý + multipart field `cover`.
- DELETE `/api/documents/:id/cover`: JWT + quyền quản lý.

## AI Chat

- Ở màn hình <768 px, lịch sử và tác vụ nhanh thu gọn mặc định, mở bằng nút có aria-expanded/aria-controls; desktop giữ các cột.
- Tìm theo tên hội thoại qua API `GET /api/chat/conversations?page=1&search=...`, tối đa 120 ký tự, chỉ tìm trong tài khoản hiện tại; giữ phân trang. Gửi tìm bằng nút/Enter, không gọi API theo từng phím.
- Câu hỏi xuất hiện ngay với trạng thái “Đang gửi · chưa lưu”. Thành công thay bằng tin nhắn từ server; lỗi giữ nội dung để gửi lại. Không lưu câu trả lời giả hoặc ghi rằng đã lưu khi chưa xác nhận.

## Kiểm chứng và giới hạn

- Backend 76/76 đạt; kiểm thử sharp thật chuyển ảnh/mất EXIF/từ chối SVG, giới hạn nguồn bìa, kiểm duyệt lại, xung đột, thu hồi quyền và tìm hội thoại theo chủ sở hữu.
- Browser production: thêm/gỡ bìa qua API giả lập, JWT trên request Blob, không gọi tệp gốc, thu gọn mobile, tìm kiếm và pending bubble đạt.
- Hồi quy 10 trang ×3 viewport và lịch sử chat đạt. Frontend lint sạch, build đạt.
- Chưa upload thử lên tài khoản Cloudinary thật hay deploy hosting. Upload/serve ảnh dùng tài nguyên và quota Cloudinary hiện có; không khẳng định miễn phí. Cần xác minh tích hợp ở môi trường triển khai.
