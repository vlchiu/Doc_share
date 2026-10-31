# Chạy và kiểm thử DocShare

Chạy các lệnh dưới đây ở thư mục gốc Doc_share. Khuyến nghị Node.js 22 và npm; CI dùng Node 22. Lượt xác minh local dùng Node 20 và Chrome hệ thống. Không đưa `.env`, token hoặc dữ liệu thật vào báo cáo lỗi.

## Cài lần đầu

Chuẩn bị backend/.env và frontend/.env theo cấu hình dự án của bạn, sau đó:

```bash
npm run setup
npm run browser:install
```

Setup cài dependency hai ứng dụng và generate Prisma Client; không tự migrate, seed hay xóa database. Cần DATABASE_URL cho Prisma generate. Trên Linux thiếu thư viện trình duyệt, chạy `npm --prefix frontend exec playwright install --with-deps chromium` (có thể cần quyền quản trị).

## Chạy local

```bash
npm run dev
```

Mở http://localhost:5173. Lệnh này chạy backend và frontend cùng lúc, dùng PORT từ backend/.env (mặc định 5000), đặt API frontend tương ứng và thêm origin localhost:5173 cho phiên chạy local. Không ghi đè .env. Ctrl+C dừng cả hai tiến trình.

Vite dùng strictPort: nếu 5173 bận sẽ báo lỗi, không âm thầm chuyển sang 5174. Dừng phiên Vite cũ rồi chạy lại. Nếu chạy backend/frontend riêng, vẫn cần tự khớp VITE_API_URL, PORT và ALLOWED_ORIGINS. Backend local dùng database/provider trong .env của bạn; đây không phải môi trường dữ liệu giả.

## Kiểm thử một lệnh

```bash
npm run test:all
```

Thứ tự: backend unit/API tests → frontend lint → kiểm thử polling → build frontend → tự mở preview 127.0.0.1:4174 → sáu bộ test trình duyệt → đóng preview. Dừng ngay khi một bước lỗi, trả exit code khác 0. Cổng 4174 phải trống.

- `npm test`: backend tests, lint, polling và build; không cần trình duyệt.
- `npm run test:browser`: build và sáu bộ test trình duyệt.
- Các bộ trình duyệt: giao diện 10 route × 3 kích thước, UX/lỗi/thử lại, lịch sử chat, ảnh bìa/mobile, độ ổn định và Web Search.
- Không cần khởi động backend thật để chạy các bài này. Browser API được mock; bản build kiểm thử dùng origin API không phải backend thật. Không dùng thư mục dist sau test để deploy: build lại bằng `npm --prefix frontend run build` với cấu hình deployment.
- Mặc định dùng Chromium do Playwright cài. Có thể đặt CHROME_PATH để dùng Chrome hệ thống; không còn bắt buộc đường dẫn Linux. Screenshot được ghi vào thư mục tạm của hệ điều hành.
- CI tại `.github/workflows/checks.yml` cài dependency, Chromium và chạy test:all; không cần secret production. CI chỉ có hiệu lực sau khi thay đổi được đưa lên GitHub.

## Những gì vẫn cần kiểm thử thực tế

Bộ test giả lập không chứng minh Cloudinary/Gemini/OTP/OAuth/SePay thật hoạt động. Dùng tài khoản và tài liệu thử để kiểm tra upload → duyệt → xem/tải → hỏi AI → tải lại lịch sử. Kiểm tra bằng tài khoản thứ hai để xác nhận quyền riêng tư. Email và thanh toán cần môi trường/tài khoản kiểm thử phù hợp trước khi thực hiện. Chưa có load test hoặc thử khôi phục database.

## Kiểm thử thanh toán SePay riêng

Tại thư mục gốc:

```bash
node --test backend/test/sepay-payment.test.js
```

Bộ bổ sung gồm 8 ca: giá/QR lấy từ server (bỏ qua giá và chủ đơn do client gửi), gói/cấu hình không hợp lệ, giao dịch cá nhân cùng số tiền, tạo đơn → webhook → VIP chỉ một lần, code/content mâu thuẫn, thiếu/thừa tiền, tài khoản bị khóa, trạng thái đơn chỉ chủ sở hữu được đọc. Database và email được giả lập, không chuyển tiền hay truy cập tài khoản SePay. Tự được chạy trong npm test/test:all và CI qua backend test/*.test.js.

Các bài security.test.js hiện có tiếp tục kiểm tra xác thực webhook, sai tài khoản nhận/tiền ra, replay, rollback và gửi trùng đồng thời. Mock DB tuần tự hóa transaction; chưa chứng minh khả năng xử lý đồng thời của PostgreSQL thật. Bộ lọc trong dashboard SePay và webhook từ Internet vẫn cần xác minh riêng. Chưa có cơ chế hết hạn đơn nên chưa coi thanh toán muộn là chức năng đã hoàn thiện.

## Kiểm tra sáu nhóm trước triển khai

| Nhóm | Lệnh / phạm vi | Giới hạn |
|---|---|---|
| Luồng ứng dụng | `npm run test:all` | Mock API/provider; không phải live E2E |
| API staging | `npm run test:staging` | Đọc API thật bằng hai tài khoản; kiểm tra quyền tài liệu riêng, danh sách và lịch sử. Chưa upload/gọi AI/OTP |
| SePay và quota tải đồng thời | `npm run test:database` | PostgreSQL thật nhưng cluster tạm, email/storage giả lập; không gọi SePay |
| Dependency và tệp Git | `npm run test:security` | Cần mạng npm registry; high/critical hoặc dump/env đang tracked trả exit1 |
| Backup/restore | `npm run test:database` | Dump/restore fixture của 14 bảng; không xác minh backup production hoặc ảnh/file Cloudinary |
| UI/mobile/polling/lazy loading | `npm run test:all` | Kích thước viewport giả lập; không phải đo tải nhiều người dùng |

### PostgreSQL và restore

Yêu cầu Linux, PostgreSQL binaries và Prisma Client đã generate. Mặc định PG_BIN=/usr/lib/postgresql/14/bin; có thể đổi biến này theo bản đã cài. Chạy bằng user thường, không phải root:

```bash
npm run test:database
```

Script tự tạo cluster trong `/tmp/docshare-security-pg.*`, chỉ mở Unix socket trong thư mục riêng, apply migration vào database trống, chạy kiểm thử transaction/quota có sẵn, thêm dữ liệu chat, pg_dump → pg_restore sang DB khác, so sánh toàn bộ dữ liệu từng bảng và thử sequence. Cuối cùng dừng và xóa cluster tạm. Không đọc .env/DATABASE_URL, không restore vào database hiện hành. Đã chạy thành công local PostgreSQL14.

### Staging thật, chủ động bật

Cần backend staging riêng và tài khoản A/B là hai người dùng khác nhau (B không phải admin). Chuẩn bị một tài liệu PENDING/riêng thuộc A. Cung cấp qua biến môi trường, không commit giá trị:

- ALLOW_STAGING_TEST=1
- STAGING_API_URL: URL gốc API staging, bao gồm `/api`
- STAGING_TOKEN_A và STAGING_TOKEN_B: access token hai tài khoản thử
- STAGING_PRIVATE_DOCUMENT_ID: ID tài liệu riêng của A

Sau đó `npm run test:staging`. Script chỉ đọc API (GET chi tiết có thể tăng lượt xem theo backend). Không gửi email, tạo thanh toán, upload hoặc gọi AI. Báo p50/max của mẫu nhỏ tuần tự, không khẳng định khả năng chịu tải. Lỗi không in token/body. Chưa chạy trên staging thật vì chưa có fixture/tài khoản staging được chỉ định.

### Những tiêu chí chưa có test thực thi đầy đủ

- Hết hạn đơn SePay và chuyển khoản muộn: nghiệp vụ hiện chưa triển khai; bộ test hiện tại không chứng nhận phần này.
- Quota AI/ngày và tổng dung lượng: chưa triển khai nên chưa có kiểm tra giới hạn/reset ngày/concurrent reservation. Chỉ quota tải xuống hiện có được kiểm tra PostgreSQL.
- Upload → duyệt → file Cloudinary → AI thật và OTP/OAuth: cần staging fixture + provider sandbox và quy trình dọn dữ liệu; chưa được bao phủ bởi staging smoke.
- Lịch backup tự động, khôi phục production và tài sản Cloudinary: chưa được chứng nhận bởi restore fixture.
- Load test, log cảnh báo, tối ưu phân trang quản trị: vẫn cần thực hiện riêng.

Kết quả lượt bổ sung: test:database PASS; test:security FAIL vì dependency có high/critical và Git theo dõi backup.sql/frontend/.env/frontend/.env.production. Flag env theo tên tệp không khẳng định mọi tệp đó chứa secret; cần rà nội dung an toàn. Không tự xóa dữ liệu hoặc sửa lịch sử Git. Các lệnh mới chạy riêng, không âm thầm đòi PostgreSQL/mạng hoặc staging trong test:all/CI hiện có.
