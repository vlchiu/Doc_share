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
