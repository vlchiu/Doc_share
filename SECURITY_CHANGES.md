# Các thay đổi bảo mật — 17/10/2026

Đã sửa source và kiểm thử cục bộ cho tài khoản, SePay và quyền tài liệu. Chưa triển khai lên website hay gọi thanh toán/email/AI/Cloudinary thật. Sau khi phát hiện local không đăng nhập Google được do thiếu cột, đã áp dụng thành công hai migration mới lên database Neon được cấu hình trong backend/.env với quyền được cấp ngày 17/10/2026. Database này không phải PostgreSQL tạm dùng kiểm thử; chưa xác nhận toàn bộ luồng Google trong trình duyệt sau cập nhật. MoMo và VNPay được tạm khóa cả tạo đơn lẫn callback, theo phạm vi đã thống nhất.

## Đã thực hiện

- Đăng ký không ghi đè tài khoản có sẵn, kể cả tài khoản Google chưa xác minh từ phiên bản cũ. Google OAuth kiểm tra email được nhà cung cấp xác minh và state chống giả mạo callback. Tài khoản Google mới không có mật khẩu nội bộ mặc định.
- OTP và token đặt lại mật khẩu lưu dạng băm; OTP giới hạn năm lần sai. Reset token chỉ dùng một lần. Đổi/reset mật khẩu, khóa tài khoản hoặc đổi quyền thu hồi phiên bằng `token_version`. API xác thực kiểm tra trạng thái hiện tại trong DB; lỗi kết nối DB không tự đăng xuất frontend.
- SePay yêu cầu webhook key, đúng tài khoản nhận, chiều tiền vào, mã đơn duy nhất và đúng số tiền. Không ghép đơn chỉ theo số tiền. Ghi nhận receipt để chống xử lý lặp; cập nhật đơn, VIP và receipt trong cùng transaction có retry xung đột. Giao dịch không khớp được ghi lại để đối soát, không tự cấp VIP. Trang kết quả hỏi backend, không tin tham số thành công trên URL.
- Quyền đọc thống nhất cho chi tiết, file, chat AI, bình luận và lưu tài liệu. Tài liệu chưa duyệt chỉ chủ sở hữu/admin đọc được; tài liệu đã xóa hoặc bị admin gỡ không đọc được. Chủ sở hữu không tự khôi phục tài liệu bị admin gỡ. Sửa tài liệu đưa về chờ duyệt; duyệt/từ chối phải khớp phiên bản để tránh duyệt nhầm nội dung mới.
- API không trả URL file gốc; trình xem trước và tải file đi qua backend có xác thực. Upload tài liệu mới dùng Cloudinary `authenticated`; avatar tách riêng. Bỏ phục vụ công khai toàn bộ thư mục uploads, giữ tuyến avatar cũ có kiểm tra tham chiếu người dùng.
- FREE mặc định 10 lượt/tháng theo giờ Việt Nam (`FREE_DOWNLOAD_LIMIT`). Xem trước toàn bộ file cũng tính một lượt vì trình duyệt đã nhận file gốc. Chủ tài liệu/admin miễn lượt; VIP còn hạn không bị giới hạn FREE. Gửi lặp cùng delivery ID trong năm phút không trừ thêm lượt. Đây không phải DRM: file đã tải về không thể thu hồi từ máy người dùng.
- Thêm công cụ audit backup và chuyển quyền Cloudinary. Thumbnail gốc được ẩn để không làm lộ nội dung chưa được cấp quyền.

## Kiểm chứng

- 25 kiểm thử hồi quy tự động đạt: tài khoản, JWT/OTP/reset, OAuth, SePay, quyền tài liệu, phiên bản kiểm duyệt, storage và khóa MoMo/VNPay.
- PostgreSQL tạm, chỉ dữ liệu giả: áp dụng đủ 22 migration; kiểm tra callback lặp đồng thời chỉ cộng VIP một lần, hai đơn đồng thời giữ đủ thời hạn, lỗi ghi VIP rollback toàn bộ và retry được, sáu lượt tải tranh một lượt còn lại chỉ một lượt được cấp, preview gửi lặp chỉ tính một lượt, chủ sở hữu miễn lượt, danh sách đã lưu ẩn bản nháp và sửa tài liệu phải duyệt lại.
- Frontend build thành công. Vẫn có cảnh báo bundle lớn; chưa coi tối ưu bundle hay toàn bộ lỗi ESLint trong báo cáo ban đầu là đã hoàn tất.
- Chưa kiểm thử trình duyệt end-to-end với email, Google, SePay, AI và Cloudinary thật.

Chạy kiểm thử từ thư mục backend:

```sh
npm test
```

`test/postgres.integration.js` cần PostgreSQL dùng riêng, đã migrate, với `TEST_DATABASE_URL` có Unix socket `/tmp/docshare-security-pg.*`. Script tự tạo dữ liệu giả và trigger thử rollback; tuyệt đối không dùng database thật. Không đọc `DATABASE_URL` làm đích kiểm thử.

## Khi triển khai

1. Sao lưu DB và kiểm chứng khả năng restore ở môi trường riêng. Lưu backup ngoài repository, giới hạn quyền truy cập. Kiểm tra cấu hình JWT, Google redirect URI, email và Cloudinary của môi trường triển khai.
2. Trong cửa sổ bảo trì, chạy từ backend với cấu hình DB đúng môi trường:

   ```sh
   npx prisma generate
   npx prisma migrate deploy
   ```

   Hai migration mới là `20261016090000_security_accounts_payments_documents` và `20261016100000_file_delivery_idempotency`. Chúng thêm phiên xác thực, phiên bản tài liệu, trạng thái admin gỡ, receipt SePay và khóa chống tính lượt lặp. Migration xóa mật khẩu/token cũ của tài khoản Google chưa xác minh; người dùng này cần đăng nhập lại qua Google được xác minh.
3. Triển khai frontend/backend đồng bộ. JWT cũ không có `tokenVersion` sẽ hết hiệu lực, người dùng phải đăng nhập lại. OTP/reset token đang chờ từ bản cũ cần yêu cầu gửi mới.
4. Chuyển file Cloudinary cũ trước khi mở lại truy cập. Inventory chỉ đọc:

   ```sh
   npm run storage:audit
   ```

   Sau khi xem inventory và backup DB, áp dụng trên môi trường triển khai:

   ```sh
   node scripts/privatize-documents.js --apply
   npm run storage:audit
   ```

   Script đổi asset sang authenticated, yêu cầu invalidation rồi cập nhật DB; có thể chạy lại khi bị ngắt giữa hai bước. Các URL không nhận diện được phải xử lý thủ công. URL public cũ vẫn là lỗ hổng cho đến khi chuyển thành công và cache hết hiệu lực; kiểm tra trực tiếp URL cũ không còn tải được. Đối chiếu [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media).
5. SePay cần `SEPAY_WEBHOOK_KEY`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_BANK_CODE`, `SEPAY_ACCOUNT_NAME`. Cấu hình webhook dùng API Key (`Authorization: Apikey …`), gửi sự kiện giao dịch theo [tài liệu SePay](https://docs.sepay.vn/tich-hop-webhooks.html). Kiểm chứng trên môi trường thử: đúng mã đơn/số tiền, gửi lặp, sai số tiền, sai tài khoản và callback thất bại được retry. Đối soát `SepayReceipt` không khớp trước khi xử lý thủ công; chưa có màn hình quản trị đối soát riêng.
6. Kiểm tra thực tế đăng ký/xác minh, Google login, reset mật khẩu, khóa tài khoản, file chờ duyệt/bị gỡ, xem trước/tải và giới hạn FREE trước khi mở lại website.

## Backup còn phải xử lý

`backup.sql` vẫn đang được Git theo dõi, có 6 dòng User, 4 trường password và 2 token xác minh không rỗng. Không in giá trị nhạy cảm, không xóa file hoặc viết lại lịch sử Git trong đợt sửa này. `.gitignore` mới chỉ ngăn thêm backup mới, không loại file đã tracked hoặc bản nằm trong lịch sử.

`npm run security:backup` (từ backend) trả mã thoát 1 khi phát hiện backup đang tracked; đây là phát hiện cần xử lý, không phải kiểm tra đã sạch. Sau khi cất bản sao an toàn bên ngoài repository, cần bỏ theo dõi file và cân nhắc làm sạch lịch sử có phối hợp với người cộng tác. Nếu repo từng bị chia sẻ hoặc công khai, rà soát phạm vi dữ liệu lộ và thu hồi thông tin xác thực liên quan.

Kiểm tra hiện tại chỉ xác nhận nội dung nhạy cảm trong backup, chưa chứng minh backup thật có thể phục hồi. Bài kiểm tra migration trên DB giả không thay thế một lần restore backup riêng biệt.

## Cập nhật sau khi chuyển file cũ — 17/10/2026

Người dùng đã chạy chuyển quyền 36 file Cloudinary. Audit ban đầu báo unsupported do bộ đọc chưa hỗ trợ đoạn chữ ký trong URL authenticated do Cloudinary trả về. Đã sửa parser, bổ sung kiểm thử URL có chữ ký cho raw/image và xác nhận audit trên database đang cấu hình trả `pending: 0, unsupported: 0`. Một file local vẫn dùng tuyến bảo vệ của backend. Chưa kiểm chứng URL public cũ hết cache hay thử xem/tải toàn bộ file trong trình duyệt; cần khởi động lại backend và kiểm tra các bước này.

## Testcase email không nhận thư — 17/10/2026

Đã bổ sung kiểm tra cú pháp và DNS trước đăng ký/gửi lại OTP. Tên miền NXDOMAIN, Null MX hoặc không có MX/A/AAAA bị từ chối; lỗi DNS tạm thời trả 503 để thử lại. Không chặn đuôi .vip. Kiểm tra dùng [Node DNS Resolver](https://nodejs.org/api/dns.html) và xử lý [Null MX theo RFC 7505](https://www.rfc-editor.org/rfc/rfc7505). DNS chỉ xác nhận khả năng định tuyến thư, không chứng minh hộp thư tồn tại.

Đăng ký/gửi lại OTP chờ kết quả gửi mail thay vì báo thành công ngay trong khi gửi nền. Nếu SMTP thất bại, trả 503; tài khoản đã tạo vẫn chưa xác minh và có thể gửi lại sau thời gian chờ. SMTP chấp nhận thư vẫn có thể trả bounce về sau. Thư Mail Delivery Subsystem trong ảnh người dùng là thông báo gửi thất bại cho người gửi; code OTP chỉ đặt người nhận là email đăng ký, không CC/BCC admin.

9 testcase mới dùng DNS/SMTP giả lập đạt, cùng 25 testcase bảo mật cũ. Frontend build đạt. Không gửi OTP thật hoặc thay đổi database trong lần kiểm tra này. Không cần migration; khởi động lại backend để áp dụng. Thử tên miền không tồn tại có thể dùng `diachu@example.invalid`; thử hộp thư thật do mình sở hữu để kiểm chứng OTP end-to-end.

## Tự dọn đăng ký chưa xác minh — 17/10/2026

Backend tự chạy dọn lần đầu sau khi khởi động một phút, sau đó mỗi phút, tối đa 500 tài khoản mỗi lần. Chỉ xóa tài khoản được tạo hơn 30 phút trước, chưa xác minh, không liên kết Google, đang hoạt động, role USER, plan FREE, không có ngày hết hạn VIP, không còn OTP/reset token có hiệu lực và không có bất kỳ dữ liệu liên quan nào (tài liệu, bình luận, thanh toán, theo dõi, thông báo, lịch sử tải, đánh giá, báo cáo hoặc tài liệu đã lưu). Điều kiện được kiểm tra lại ngay trong lệnh xóa để tránh xóa tài khoản vừa xác minh hoặc vừa liên kết Google. Không xóa dây chuyền dữ liệu.

Không cần migration hay cron riêng; khởi động lại backend sẽ bật tác vụ và có thể xóa các đăng ký cũ đủ điều kiện trong database mà backend đang kết nối. Tác vụ chỉ chạy khi tiến trình backend hoạt động; máy chủ ngủ hoặc dừng sẽ làm chậm lịch dọn. Lỗi DB được ghi bằng mã lỗi, thử lại kỳ sau, không làm dừng API. Không chạy xóa thủ công trên database trong lần triển khai source này.

Bốn kiểm thử mới xác nhận bộ lọc bảo vệ, thời hạn token, kiểm tra lại điều kiện lúc xóa, giới hạn batch và xử lý scan trống/lỗi DB. Dọn đăng ký rác không ngăn hoàn toàn spam gửi mail: giới hạn gửi email 5 yêu cầu/15 phút/IP và gửi lại OTP tối thiểu 60 giây vẫn được giữ. Rate limit hiện lưu trong bộ nhớ từng tiến trình; triển khai nhiều instance cần kho giới hạn dùng chung. Email tạm thời nhận được OTP và đã xác minh không thuộc diện bị xóa.

## Admin xóa tài khoản

Trang quản lý người dùng có nút Xóa tài khoản, yêu cầu nhập chính xác email xác nhận. API `DELETE /api/admin/users/:id` kiểm tra quyền admin, ID, không cho tự xóa hoặc xóa admin. Tài khoản có tài liệu (kể cả trong thùng rác), bất kỳ đơn thanh toán hoặc báo cáo vi phạm bị từ chối xóa; dùng khóa tài khoản để giữ lịch sử. Các tài khoản khác được xóa vĩnh viễn cùng bình luận, đánh giá, mục đã lưu, lịch sử tải, thông báo và quan hệ theo dõi trong transaction Serializable. Không xóa asset avatar trên Cloudinary trong luồng này. Session của tài khoản đã xóa không còn xác thực được do middleware kiểm tra DB.

Bốn testcase dùng database giả lập đạt: phân quyền/xác nhận, bảo vệ tài khoản có dữ liệu cần lưu, xóa thành công/không tìm thấy, rollback khi lỗi FK. Frontend build đạt. Không xóa tài khoản thật khi kiểm thử. Không cần migration; khởi động lại backend và tải lại frontend để sử dụng.
