# Hạn mức tài khoản

## Triển khai Render/Vercel

Chưa áp dụng migration production, chưa push/deploy. Thay đổi cần migration `20261102090000_account_quotas` trước khi backend mới chạy (Document.file_size nullable + bảng UsageReservation). Migration chỉ thêm dữ liệu cấu trúc, không xóa dữ liệu cũ. Dùng build backend hiện có `npm run build` (generate + migrate deploy); kiểm tra cấu hình Render thực tế trước khi push tự deploy. Không chạy migration này vào production từ terminal thử.

1. Để ACCOUNT_QUOTAS_ENABLED=false khi deploy migration/code lần đầu. Không chặn người dùng hiện tại.
2. Tại backend, chạy `node scripts/backfill-file-sizes.js` để đọc metadata Cloudinary/kích thước file local cũ. Mặc định chỉ báo cáo; `--apply` mới ghi kích thước vào DB. Cần quyền Cloudinary Admin API; không in URL/key. Script chưa chạy với dịch vụ thật. Tài liệu lỗi phải đối soát riêng, không đoán bằng 0.
3. Cấu hình Render FREE_AI_DAILY_LIMIT, VIP_AI_DAILY_LIMIT, FREE_STORAGE_MB, VIP_STORAGE_MB theo chính sách chủ dự án chọn. Số nguyên không âm; 0 là không giới hạn. Chưa áp đặt giá trị mặc định thương mại. Bật ACCOUNT_QUOTAS_ENABLED=true sau khi kiểm thử staging/backfill.
4. Frontend không cần biến mới. Hồ sơ hiển thị mức sử dụng và nút làm mới qua GET /api/auth/usage (JWT, no-store).

## Quy tắc

- AI Chat: gồm hội thoại lưu và endpoint chat cũ. Một phản hồi thành công tính một lượt; thất bại hoàn lượt. Hội thoại replay theo requestId không tính lại. Ghi lượt thành công cùng transaction với cặp tin nhắn; pending chiếm lượt khi đang chạy.
- Ngày reset lúc 00:00 Asia/Ho_Chi_Minh. VIP chỉ hưởng mức VIP nếu chưa hết hạn; đọc từ DB mỗi lần reserve. Web Search có cơ chế riêng, không thuộc quota AI Chat này; AI kiểm duyệt upload cũng không tính trong bộ đếm chat. Đây là giới hạn lượt, không phải giới hạn token/chi phí tuyệt đối.
- Dung lượng là tổng file gốc được Document tham chiếu, kể cả thùng rác/rejected. Chưa tính avatar, cover, lịch sử chat hay orphan trên Cloudinary; không phải số dung lượng tài khoản Cloudinary.
- Upload giữ trước dung lượng theo Content-Length multipart (capped 20 MB), trước khi gửi file sang Cloudinary; quota có thể từ chối sát hạn mức do overhead multipart. Không chấp nhận upload thiếu Content-Length khi bật quota. Bản thay file phải đủ chỗ giữ cả file cũ/mới lúc upload. Không cho giá kích thước do client gửi riêng làm số liệu đã lưu; lưu bytes do storage trả về.
- Tài liệu cũ thiếu kích thước sẽ chặn upload khi storage limit >0. Không bỏ qua để vượt quota. Xóa vĩnh viễn Document mới giảm mức sử dụng logic.
- Reservation được khóa theo user và transaction Serializable để xử lý nhiều instance. Server crash có thể để lại pending: AI pending hết ảnh hưởng sang ngày mới; storage pending phải đối soát upload/Document/Cloudinary trước khi giải phóng. Không tự hết hạn reservation đang bay để tránh vượt quota. Không xóa pending hàng loạt trên production.
- UsageReservation AI cũ chưa có job retention; cần lập lịch dọn các bản ghi completed thuộc ngày cũ theo chính sách lưu dữ liệu sau này.

## Kiểm thử

`npm run test:database` tự tạo PostgreSQL tạm, chạy quota concurrency, hoàn lượt, giữ lượt thành công, đổi ngày, VIP hết hạn, legacy sizes, trash, xóa vĩnh viễn và backup/restore 15 bảng. Không dùng DATABASE_URL production. Các tests cũ chạy với quota mặc định tắt để kiểm tra tương thích. Chưa kiểm chứng upload Cloudinary thật/Render/Vercel hay backfill thật.

## Cập nhật 02/11/2026

Sau khi user xác nhận, migration quota đã áp dụng thành công vào database trong backend/.env. Trước áp dụng chỉ có migration quota đang chờ. Đã xác minh truy vấn Document kèm quan hệ và UsageReservation thành công; lỗi P2022 được giải quyết. Không bật quota hoặc chạy backfill. Những database khác vẫn cần migrate trước chạy code mới.
