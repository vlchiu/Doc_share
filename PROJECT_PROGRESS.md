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
