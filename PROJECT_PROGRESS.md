# DocShare — trạng thái để tiếp tục sau khi reset ngữ cảnh

Cập nhật: 30/10/2026 (Asia/Ho_Chi_Minh).

## Yêu cầu và trạng thái

Người dùng yêu cầu thay giao diện React/Tailwind theo 10 ảnh tham chiếu: trang chủ, đăng nhập, đăng ký, danh sách tài liệu, chi tiết tài liệu, AI Chat, Web Search, VIP, hồ sơ và quản trị. Giữ API/backend hiện có, không dùng ảnh chụp nguyên trang làm nền, tách component tái sử dụng.

**Đã triển khai và kiểm chứng cục bộ.** Không còn bước triển khai bắt buộc đang chạy. Bước tiếp theo nếu người dùng nhắn “tiếp tục”: đọc tệp này và UI_REDESIGN.md, kiểm tra thay đổi mới trong Git/source, rồi xác định phản hồi hoặc chỉnh sửa tiếp theo người dùng muốn. Không tự viết lại những phần đã hoàn thành, không tự deploy hay sửa backend trong tác vụ giao diện.

Người dùng yêu cầu lưu trạng thái để tiếp tục sau khi reset token. Tệp này là bàn giao bền vững, không dựa vào lịch sử chat.

## Phần đã hoàn thành

- Shell dùng chung: header tìm kiếm, sidebar desktop/mobile, menu tài khoản, điều hướng quản trị theo quyền.
- Brand SVG; Hero và hình giấy/AI vẽ bằng CSS/DOM; ảnh bìa từ thumbnail_url với fallback.
- Component trong frontend/src/components/docshare: AppShell, AuthLayout, Brand, DocumentCard/DocumentRow/DocumentThumbnail/FileBadge, FormField, Primitives (Panel/Hero/DocumentArt/FeatureList/QuickAI/VipPromo/MoreLink).
- Trang Home và /documents đọc API thật, giữ lọc/sắp xếp/phân trang; map đúng PDF→pdf, PPT→powerpoint, DOC→word, XLS→excel.
- Login/Register giao diện hai cột; giữ API login/Google/register/OTP; xác nhận mật khẩu frontend.
- /ai-chat dùng /chat/general hoặc /chat/:id khi có ?document=id; phiên hiện tại, tác vụ nhanh, copy và abort khi unmount.
- Detail giữ quyền preview/tải/lưu/đánh giá/bình luận, thêm cột metadata/nguồn liên quan và liên kết AI Chat. Không tự mở preview vì có thể trừ lượt tải.
- Web Search summary cột phải trên desktop, mobile chuyển thành một cột; giữ hủy và lỗi.
- VIP dùng giá từ API và SePay thật trong source. Profile chỉ sửa trường API hỗ trợ. Admin giữ handler và dữ liệu thống kê, sidebar chuyển các tab qua query string.
- Style chung frontend/src/docshare.css, import từ main.jsx. App.jsx giữ các route cũ và bổ sung /documents, /ai-chat.
- Tài liệu: UI_REDESIGN.md; WEB_SEARCH.md đã cập nhật phần shell.

## Kiểm thử đã chạy

- Frontend npm run build đạt sau thay đổi giao diện cuối. Cảnh báo chunk chính khoảng 1.10 MB (gzip khoảng 331 kB), >500 kB.
- ESLint phạm vi component/page được thay đổi: 0 lỗi, 2 warnings effect dependencies ở AdminDashboard và VIPUpgrade (luồng cũ). Lỗi vị trí eslint-disable ở Home do format đã sửa và lint lại đạt ngày 30/10.
- frontend/test/docshare-ui.browser.cjs: PASS 10 route × 3 viewport (1440, 768, 375), không tràn ngang; PASS các thao tác tìm kiếm/file type, login error, register→OTP, AI Chat và SePay create. Dùng mock API, không chạm DB hoặc dịch vụ thật.
- Đã xem ảnh browser trang chủ/login/mobile để đối chiếu bố cục. Screenshot nằm /tmp/docshare-ui-shots (có thể mất sau reset môi trường).
- git diff --check đạt trước bàn giao.
- Các kiểm thử backend 55/55 đã đạt ở tác vụ Web Search trước đó; không sửa backend trong tác vụ giao diện này.

## Chạy lại

Từ frontend: npm run dev -- --host 127.0.0.1. Chọn đúng cổng Vite in ra (lần kiểm tra dùng 5174 vì 5173 đã bận).

Từ root:
PLAYWRIGHT_MODULE=/tmp/docshare-web-test/node_modules/playwright TEST_BASE_URL=http://127.0.0.1:5173 node frontend/test/docshare-ui.browser.cjs

Playwright và Prettier được cài vào /tmp/docshare-web-test, không thêm dependencies vào project. Chrome: /usr/bin/google-chrome. Nếu /tmp bị dọn thì cài lại công cụ kiểm thử. Sandbox chặn mở cổng/Chrome; dùng quy trình approval escalation nếu cần, không lách sandbox.

## Giới hạn / lựa chọn có chủ đích

- Ảnh mẫu có số liệu/trường/tính năng không tồn tại trong API: không làm giả dung lượng, tăng trưởng, lịch sử chat, bộ lọc web giả, phương thức MoMo/VNPay đang bị tắt hoặc trường hồ sơ chưa lưu được.
- Nội dung và ảnh bìa thật phụ thuộc dữ liệu; minh họa CSS là bản dựng tương tự, không phải asset 3D gốc. UI không phải bản sao từng pixel.
- Chưa chạy E2E với DB/email/payment/provider thật; chỉ mock API và build.
- Không có commit/deploy được tạo. Working tree có thay đổi của nhiều tác vụ trước; không reset/ghi đè.

## Ngữ cảnh Web Search trước đó

- /api/web-search JWT + quota user + Tavily + Gemini summary, kiểm tra citation, timeout, cache, abort.
- Ban đầu Groq đã được thay bằng Gemini theo yêu cầu. Web Search dùng GEMINI_API_KEY và GEMINI_WEB_SEARCH_MODEL (mặc định giống lựa chọn đầu trong Chat). Groq service vẫn phục vụ fallback của AI Chat cũ.
- Khóa Tavily người dùng cung cấp đã lưu vào backend/.env. **Không đưa khóa, token hoặc nội dung .env vào bàn giao/log/chat.** Không ghi lại giá trị khóa ở đây. Chưa xác minh end-to-end với provider thật.
- Các file backend hiện modified/untracked thuộc tác vụ Web Search trước đó, không phải thay đổi backend của redesign.

## Cập nhật footer — 30/10/2026

Người dùng nhận xét thiếu footer và yêu cầu đánh giá giao diện. Đã thêm component `frontend/src/components/docshare/Footer.jsx` vào cuối AppShell: giới thiệu ngắn, liên kết tài liệu/upload/AI Chat/Web Search, copyright và nút về đầu trang (đưa focus vào main). Layout đăng nhập/đăng ký riêng vẫn giữ thiết kế tối giản. Không tạo liên kết chính sách/hỗ trợ giả khi chưa có trang nội dung. Build và lint Footer/AppShell đạt; chưa chạy lại browser suite cho riêng thay đổi nhỏ này.

Các điểm đề xuất cho lần sau, chưa tự mở rộng phạm vi: trang hướng dẫn/hỗ trợ/chính sách với nội dung do chủ dự án cung cấp; đồng bộ error/loading/empty cho các trang cũ; nâng độ chi tiết minh họa và ảnh bìa thật; kiểm tra bàn phím/focus trên menu và dialog toàn hệ thống. Lịch sử chat lâu dài cần chức năng lưu, không phải chỉ đổi giao diện.

## Hoàn thiện UX và chính sách thử nghiệm — 30/10/2026

Người dùng đã đồng ý làm lần lượt các đề xuất và xác nhận: “tất cả đều là bản thử, ra chính sách chung chung”. Đã triển khai frontend, giữ nguyên backend/API:

- Trang công khai `/help` (hướng dẫn + FAQ tìm không dấu), `/support` (soạn và sao chép yêu cầu; không gửi tin nhắn/ticket), `/terms`, `/privacy`, `/copyright`. Footer và auth layout có liên kết thật. Chính sách mô tả bản thử, không bịa đơn vị/email/SLA hoặc chứng nhận tuân thủ; nội dung trong `frontend/src/content/`.
- `useRemoteData` hủy request cũ, tách lỗi/tải/rỗng và nút thử lại cho MyDocuments, SavedDocuments, Trash, DownloadHistory, Profile, VIP và UserProfile. Detail, Upload và Admin có xử lý lỗi tải/thử lại; lỗi danh mục Upload giữ nội dung đang nhập. Notifications có tải/lỗi/thử lại.
- `ResourceState` dùng chung; thumbnail fallback theo màu/nhãn định dạng, lazy load và ghi nhớ URL lỗi thay vì chặn mọi ảnh mới. Link ảnh có tên truy cập rõ ràng. Loại bỏ liên kết bọc nút thao tác ở My/Saved.
- `Modal` native dialog dùng cho mobile navigation, danh sách theo dõi, xử lý báo cáo quản trị: Tab vòng, Escape, khóa scroll nền, trả focus. Menu tài khoản focus vào liên kết đầu/đóng khi rời; notifications dùng nút bàn phím. Thêm skip link và focus-visible.
- Build đạt; ESLint các file thay đổi: 0 lỗi, 1 cảnh báo dependency `userSearch` ở Admin từ luồng tìm kiếm bấm nút cũ. Bundle chính khoảng 1.13 MB vẫn có cảnh báo >500 kB.
- `docshare-ui.browser.cjs` đạt 10 route × 3 viewport và các hợp đồng API mock (search/login/OTP/AI/SePay).
- `ux-improvements.browser.cjs`: kiểm tra lỗi 503 → retry thành công trên 10 trang, 5 trang công khai × 3 viewport, bàn phím menu/dialog, FAQ, fallback thumbnail và support không POST. Toàn bộ API giả lập, không gửi email/chuyển tiền/gọi provider thật.

Không có deploy/commit. Nội dung chính sách dành cho bản thử theo yêu cầu; khi vận hành thật cần cập nhật danh tính, kênh hỗ trợ, thực tế lưu trữ và điều kiện dịch vụ. Các kiểm tra bàn phím tập trung vào các menu/dialog nêu trên, không phải chứng nhận accessibility toàn ứng dụng. Các tab quản trị thứ cấp và widget chat cũ có thể cần một đợt kiểm tra riêng. Không tự mở rộng backend để lưu hội thoại lâu dài hoặc gửi yêu cầu hỗ trợ.

Kết quả xác nhận cuối: `ux-improvements.browser.cjs` PASS toàn bộ, bao gồm FAQ, ảnh bìa hỏng, retry 10 trang, keyboard và support không POST; không có pageerror. `git diff --check` đạt. Vite dùng để kiểm thử đã được dừng.

## Lưu lịch sử AI Chat — 30/10/2026

Người dùng yêu cầu triển khai lưu hội thoại, cho phép mở rộng backend/database (khác phạm vi UI trước đó). Đã thêm Conversation/ChatMessage, migration `20261030090000_chat_history` **đã áp dụng thành công vào PostgreSQL hiện tại**, Prisma Client đã generate. Không có migration cũ nào đang chờ khi áp dụng.

- API CRUD hội thoại và gửi tin nhắn có JWT/quyền sở hữu/quyền tài liệu; atomic pair, chống trùng request, khóa gửi đồng thời và chống ghi lại hội thoại đã xóa. Ngữ cảnh lấy 10 tin nhắn gần nhất từ DB.
- AIChat dùng lịch sử thật, reload/mở lại/đổi tên/xóa/phân trang. Nút chat nổi chuyển đến cùng trang lưu trữ. Sửa CSS mobile để lịch sử không bị ẩn; sidebar desktop được display:none trên mobile vì đã có dialog riêng.
- Đã cập nhật hướng dẫn và quyền riêng tư để mô tả lịch sử lưu theo tài khoản. Các tin nhắn trước đây chỉ nằm trong RAM không tự khôi phục.
- 64/64 backend tests đạt; PostgreSQL smoke check rollback đạt; browser lịch sử và regression 10 route × 3 viewport đạt; build/lint chat đạt. Không gọi AI thật, không deploy hosting, không commit.
- Bàn giao/API/triển khai/giới hạn chi tiết: `CHAT_HISTORY.md`. Tính năng lưu lịch sử không cần thuê thêm server; cần chạy backend/frontend source mới. Các mục cũ trong file này ghi “chỉ phiên hiện tại” đã được thay thế bởi phần cập nhật này.

Xác nhận cuối phần chat: kiểm thử lịch sử trình duyệt đã PASS sau khi chờ đúng màn hình mới của React Router; lịch sử hiển thị ở cả 1440/768/375 px. Đã xem screenshot mobile. Bộ UX (retry, menu Tab/Escape, FAQ, thumbnail, support) chạy lại PASS sau sửa sidebar. Build và lint chat cuối cùng đạt, `git diff --check` đạt. Vite kiểm thử đã được dừng; chưa khởi động lại/deploy tiến trình backend của người dùng.


## Hoàn tất hai nhóm độ ổn định + tối ưu tải trang — 30/10/2026

Người dùng đã xác nhận phạm vi hai nhóm (không chỉ hai dòng đầu bảng review). Đã hoàn thành:

- Backend runtime `node index.js`, kiểm tra bản cài production riêng ở /tmp/docshare-production-check bằng npm ci --omit=dev + Prisma generate + HTTP health với thông tin giả.
- AI deadline tổng 45s, per-attempt Gemini 20s, AbortSignal, timeout504 không lưu dở/không giữ khóa; UI phục hồi cặp tin nhắn đã commit khi HTTP response bị mất.
- Polling SePay tuần tự và hủy request, không xử lý thành công của đơn đã đóng; không reload trang sau kích hoạt VIP, clipboard await/catch.
- Admin users/AI moderation dùng useLatestRequest để chống response cũ; search theo nút/Enter.
- Lazy routes + Suspense + RouteBoundary, không tải trước Admin/chart/AI Chat trên trang chủ. Lint toàn frontend sạch.
- JS tải ban đầu cả entry/modulepreload: 462.360 byte, gzip cộng 156.475 byte (trước ~1.118 MB/~338 KB gzip). Không còn chunk >500 KB. Không khẳng định đây là số đo tốc độ trên thiết bị thật.

Kiểm tra cuối: backend 69/69, poller3/3; production startup smoke; lint/build; production browser regression10×3, chat-history/mất response, stale admin search, thanh toán chậm/hủy/thành công và lỗi chunk tải lại đều PASS. git diff --check đạt. Cập nhật QUALITY_REVIEW.md và CHAT_HISTORY.md. Không deploy hosting, không thay schema/database hoặc gọi provider thật trong lượt này. Không tự làm tiếp thumbnail/UX mobile/quota/live E2E vì nằm ngoài hai nhóm đã chọn.

Preview production phục vụ kiểm thử đã dừng. Nếu tiếp tục, đọc phần cập nhật đầu QUALITY_REVIEW.md để tránh làm lại các mục đã hoàn thành. Working tree có thể đã được người dùng commit trong quá trình thực hiện; luôn kiểm tra git status trước khi chỉnh sửa, không reset.


## Tiếp tục ảnh bìa an toàn và UX Chat

Người dùng yêu cầu làm các phần tiếp theo. Đã hoàn thành ảnh bìa chọn riêng trên chi tiết tài liệu (owner/admin), chuẩn hóa bằng sharp, Cloudinary authenticated asset riêng và proxy WebP có kiểm tra quyền/version; không lộ tệp gốc, không trừ quota tải. Dùng thumbnail_url cũ, không migration. Thêm dependency sharp vào backend production; chưa gọi Cloudinary thật hoặc deploy.

AI Chat: thu gọn lịch sử/tác vụ trên mobile, tìm tên hội thoại trên server theo owner, câu hỏi pending hiển thị ngay có trạng thái chưa lưu; giữ retry/idempotency. Desktop giữ layout cũ. Đã bổ sung hướng dẫn ảnh bìa trong trang Help.

Kiểm chứng: backend76/76; frontend lint sạch/build đạt; browser covers-mobile và chat-history, regression10route×3viewport đều PASS. Đã xem screenshot mobile. Test files: backend/test/covers.test.js, frontend/test/covers-mobile.browser.cjs; bàn giao `DOCUMENT_COVERS.md`. Các lượt test dùng API/provider mock, riêng chuẩn hóa ảnh dùng sharp thật. Chưa thực hiện quota dài hạn/live E2E/backup restore/load test. Preview kiểm thử đã dừng.

## Sửa kết nối local cổng 5174 — 31/10/2026

Ảnh người dùng mở localhost:5174, trong khi backend allowlist chỉ có localhost:5173 và frontend gọi localhost:5000. Đã thêm origin localhost:5174 vào backend/.env local (không đổi chính sách CORS production). Cần restart backend để áp dụng. Home dùng useRemoteData cho danh mục để phân biệt loading/error/empty và có retry, không nuốt lỗi thành danh mục rỗng. Frontend lint/build đạt; chưa xác minh HTTP với backend đang chạy của người dùng.

## Chuẩn hóa local và kiểm thử một lệnh — 31/10/2026

Đã thêm package.json gốc + scripts/workspace.cjs: setup, dev, test, test:browser, test:all, browser:install. Dev chạy hai ứng dụng, đồng bộ API theo PORT backend, thêm origin local vào môi trường tiến trình; Vite cố định 5173/strictPort. Không ghi đè .env, không migrate database. Backend có script generate riêng để npm --prefix chạy đúng thư mục Prisma.

Playwright là devDependency frontend (lockfile cập nhật); browser mặc định dùng Chromium Playwright, CHROME_PATH tùy chọn, ảnh test dùng thư mục tạm hệ điều hành. Runner test build API giả lập, mở preview cổng 4174, chạy sáu suite tuần tự và đóng preview. Đã thêm GitHub Actions Node22; chưa chạy trên GitHub/Windows. Hướng dẫn LOCAL_TESTING.md.

Kiểm chứng local: CHROME_PATH=/usr/bin/google-chrome npm run test:all đạt exit0, backend76/76, poller3/3, lint/build, sáu suite trình duyệt. Prisma generate từ gốc đạt. Không chạy dev với database live, không gọi provider/email/thanh toán thật. Test bị sandbox chặn HTTP lúc đầu, chạy lại ngoài sandbox thành công. npm install báo 35 cảnh báo dependency (2 low,14 moderate,18 high,1 critical); chưa audit phân loại production/dev hay tự nâng version phá vỡ tương thích. Cần rà riêng. Chưa commit/deploy.

## Bổ sung kiểm thử thanh toán tự động

Thêm backend/test/sepay-payment.test.js với 8 ca nghiệp vụ SePay (giá server/QR, gói/cấu hình lỗi, giao dịch cá nhân, thanh toán và gửi lại không cộng VIP/email trùng, code mâu thuẫn, thiếu/thừa tiền, user bị khóa, quyền polling). Không sửa logic thanh toán. Full backend npm test đạt84/84 ngoài sandbox; không gọi dịch vụ thật, không chạy lại browser vì chỉ thêm test backend. LOCAL_TESTING.md có lệnh chạy riêng và giới hạn mock. Các test mới tự tích hợp test:all/CI hiện có.

## Kiểm thử vận hành theo sáu nhóm

Thêm test:database (PostgreSQL tạm Unix socket, migrations + integration concurrency + pg_dump/restore so sánh14 bảng/chat/sequence), test:security (npm audit production/all hai app + tracked dump/env), test:staging (explicit staging URL/two tokens/private doc fixture, GET quyền/lists/history/timings). Không dùng DB live hoặc gửi email/thanh toán.

Đã chạy test:database PASS PostgreSQL14, cluster tự dọn. test:security FAIL có high/critical cả production/dev và tracked backup.sql, frontend/.env, frontend/.env.production. Không in nội dung bí mật, không sửa dependency/delete Git. test:staging mới syntax checked, chưa chạy live do thiếu staging fixture. LOCAL_TESTING.md phân biệt rõ nhóm còn thiếu: order expiry/late transfer, AI/storage quota, live upload/AI/OTP, backup schedule/cloud assets, load. Không tuyên bố sáu nhóm đều đạt. Các script mới được gọi riêng, không nối vào CI/test:all mặc định.
