# DocShare — giao diện theo ảnh tham chiếu

## Phạm vi

Triển khai trong React/Tailwind của repository hiện tại. Không sửa backend, schema hay hợp đồng API trong lần thay giao diện này. Không dùng ảnh chụp làm nền; logo là SVG, minh họa giấy/AI là các phần tử CSS, ảnh bìa tài liệu lấy từ `thumbnail_url` và có fallback khi thiếu/lỗi ảnh.

Bố cục: nền xanh rất nhạt, khung trắng bo góc, header có tìm kiếm, sidebar dùng chung, màu hành động xanh dương, panel viền nhẹ. Trang đăng nhập/đăng ký có khối giới thiệu và biểu mẫu hai cột. Sidebar thu thành menu ở mobile; các cột phụ chuyển xuống dưới; bảng quản trị cuộn trong vùng bảng.

## Các trang

- `/`: banner, danh mục từ API, tài liệu mới và panel trợ lý AI.
- `/documents`: tìm kiếm, lọc định dạng/danh mục/ngày, sắp xếp, phân trang và chuyển lưới/danh sách; dùng GET `/api/documents` hiện tại.
- `/documents/:id`: thông tin, xem trước an toàn theo thao tác người dùng, tải/lưu/chia sẻ/đánh giá/bình luận và tài liệu liên quan. Không tự mở preview làm trừ lượt tải.
- `/login`, `/register`: giao diện mới; giữ đăng nhập, Google OAuth, đăng ký và OTP. Thêm xác nhận mật khẩu trên frontend; giữ yêu cầu tối thiểu 6 ký tự của source hiện tại.
- `/ai-chat`: trang chat riêng, gọi `/chat/general` hoặc `/chat/:id` khi có `?document=id`. Tác vụ nhanh điền câu hỏi; sao chép câu trả lời; tạo phiên mới; hủy request khi rời trang. Không giả lịch sử hội thoại từ server: chỉ hiển thị phiên hiện tại.
- `/web-search`: banner tìm kiếm và danh sách nguồn bên trái, summary bên phải trên desktop; giữ hai bộ lọc thực sự được API hỗ trợ và toàn bộ luồng hủy/lỗi hiện có.
- `/vip`: giá và kỳ hạn từ `/payment/plans`, giữ SePay và màn QR hiện có.
- `/profile`: avatar, sửa tên, email chỉ đọc, mật khẩu, thống kê từ API và liên kết đến tài liệu đã lưu/lịch sử tải.
- `/admin`: tổng quan, biểu đồ từ dữ liệu thật, danh sách chờ duyệt và sidebar theo các chức năng quản trị hiện có; giữ toàn bộ handler quản trị.

Các route khác vẫn nằm trong shell mới và giữ màn hình nghiệp vụ hiện có.

## Component dùng chung

`frontend/src/components/docshare/`:

- `AppShell.jsx`: header, tìm kiếm toàn trang, tài khoản, điều hướng desktop/mobile và quản trị.
- `Brand.jsx`: logo dạng vector.
- `Primitives.jsx`: Panel, Hero, DocumentArt, FeatureList, QuickAI, VipPromo, MoreLink.
- `DocumentCard.jsx`: thẻ tài liệu, hàng tài liệu, thumbnail và nhãn định dạng.
- `AuthLayout.jsx`: bố cục tài khoản và nút Google OAuth.
- `FormField.jsx`: label, input, icon và nút hiện/ẩn mật khẩu.

Styles dùng Tailwind cùng `frontend/src/docshare.css` cho bố cục, minh họa và breakpoint; `WebSearch.css` cho phần nguồn/summary.

## Khác biệt có chủ đích với ảnh mẫu

Không gán số liệu mẫu cho người dùng thật: không hiển thị dung lượng 2.4 GB, tăng trưởng %, nguồn đề xuất giả hoặc lịch sử chat giả. Không thêm các trường hồ sơ chưa có API lưu. Không hiển thị MoMo/VNPay đang bị vô hiệu hóa; giá VIP lấy từ API. Không thêm checkbox điều khoản hoặc ghi nhớ đăng nhập không có hành vi tương ứng. Nội dung tài liệu và ảnh bìa phụ thuộc dữ liệu của hệ thống nên không giống các tài liệu minh họa trong ảnh.

## Kiểm chứng

```bash
cd frontend
npm run build
npm run dev -- --host 127.0.0.1
```

Browser test dùng dữ liệu fixture và chặn toàn bộ API, không tác động database/email/thanh toán thật:

```bash
npm install --prefix /tmp/docshare-web-test playwright
PLAYWRIGHT_MODULE=/tmp/docshare-web-test/node_modules/playwright \
TEST_BASE_URL=http://127.0.0.1:5173 \
node frontend/test/docshare-ui.browser.cjs
```

Cần Chrome; có thể đặt `CHROME_PATH`. Chạy từ thư mục gốc repository. Screenshot kiểm chứng lưu trong `/tmp/docshare-ui-shots`.

Đã kiểm tra 10 route ở 1440, 768 và 375 px, không tràn ngang. Kiểm tra các thao tác tìm kiếm/định dạng, đăng nhập, đăng ký đến bước OTP, AI chat và tạo QR bằng mock API. Đây không phải kiểm thử tích hợp với dịch vụ thật.

Build frontend đạt. Lint phạm vi component/page thay đổi không có lỗi; còn hai cảnh báo dependency effect ở AdminDashboard và VIPUpgrade từ luồng tải dữ liệu hiện có. Build vẫn cảnh báo bundle lớn hơn 500 kB.

## Bổ sung UX cho bản thử nghiệm (30/10/2026)

- Footer có các trang thật: Hướng dẫn, Hỗ trợ, Điều khoản, Quyền riêng tư, Bản quyền. Nội dung chung cho bản thử được người dùng chấp thuận, không có email/đơn vị giả. Support chỉ chuẩn bị và sao chép nội dung cục bộ.
- Component `ResourceState`, hook `useRemoteData`, dialog `Modal` tái sử dụng. Phân biệt lỗi API với dữ liệu rỗng, retry/cancel, xử lý ảnh bìa lỗi, cải thiện bàn phím và focus cho shell/dialog.
- Regression mới: `PLAYWRIGHT_MODULE=/tmp/docshare-web-test/node_modules/playwright TEST_BASE_URL=http://127.0.0.1:5174 node frontend/test/ux-improvements.browser.cjs`.
- Chi tiết phạm vi, kiểm chứng và giới hạn xem phần cuối PROJECT_PROGRESS.md.

## Lịch sử AI Chat (30/10/2026)

Theo yêu cầu tiếp theo của người dùng, đã bổ sung backend/PostgreSQL để lưu chat. Mô tả “chỉ phiên hiện tại” ở trên là trạng thái trước tính năng này. `/ai-chat?conversation=<id>` có lịch sử thật, đổi tên/xóa và tải thêm tin nhắn. Điểm vào AI trên tài liệu dùng chung màn hình này. Xem `CHAT_HISTORY.md` và phần cuối `PROJECT_PROGRESS.md`.
