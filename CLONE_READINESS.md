# Rà soát bản clone — 10/11/2026

## Đã sửa lần lượt — 11/11/2026

- **Quên mật khẩu:** nguyên nhân của tài khoản người dùng xác nhận là tài khoản Google đã verified, chưa có local password; code cũ bỏ qua gửi thư. Cho phép tài khoản đã xác minh nhận link thiết lập mật khẩu riêng. API chờ SMTP chấp nhận đúng recipient; lỗi gửi trả 503 và thu hồi đúng token thất bại, không ghi đè token yêu cầu mới hơn. Giữ response chung cho tài khoản không tồn tại/không đủ điều kiện. Thư reset thật đã được Gmail chấp nhận cho địa chỉ người dùng yêu cầu; chưa có xác nhận hộp thư đến. Không ghi email, token hoặc credential ở đây. Không tự đặt mật khẩu cho tài khoản thật.
- **Dọn file:** cleanup hoạt động khi quota tắt; xử lý finish/close và upload hoàn tất sau mất kết nối; không ghi DB sau khi file bị dọn. Không dọn khi transaction đang chạy hoặc file vẫn được DB tham chiếu (kể cả mất acknowledgement commit). Thay file thành công dọn file gốc cũ khi không còn tài liệu tham chiếu. File cũ đã bỏ lại từ trước chưa được quét/xóa hàng loạt. Lỗi provider/DB lúc cleanup để lại log mã lỗi an toàn, vẫn cần đối soát khi hạ tầng phục hồi.
- **Danh mục:** kiểm tra cả tài liệu trong thùng rác trước khi xóa; FK conflict do thao tác đồng thời trả 409, không trả lỗi SQL.
- **API/log:** bỏ error.message khỏi các response lỗi nội bộ; bổ sung middleware lỗi JSON chung và mapping lỗi upload an toàn. Giữ thông báo validation/quota hữu ích; log provider chỉ tên/mã lỗi.
- **Google tùy chọn:** backend không còn crash khi clone chưa có Google credentials; routes Google trả 503 rõ ràng. Cấu hình đang có vẫn giữ nguyên.
- **SePay:** hạn thanh toán 30 phút tính từ created_at đã lưu, không cần migration. Polling/history hiển thị EXPIRED; webhook không cấp VIP cho đơn quá hạn. Receipt chuyển muộn được giữ để đối soát, không tự hoàn tiền. UI ẩn QR/khóa thao tác thanh toán khi hết hạn. SUCCESS không bị chuyển thành EXPIRED. Chậm giao webhook qua mốc hết hạn cần đối soát thủ công; chưa thử chuyển khoản thật.
- **Kiểm chứng:** hồi quy backend, lint/build, polling và sáu browser suites đã đạt; browser stability có thêm ca SMTP failure/waiting và đơn hết hạn. Có bổ sung kiểm thử cleanup cho lost DB acknowledgement sau lượt tổng; kiểm thử phạm vi cleanup/quota đạt. Kết quả cuối cập nhật bên dưới nếu có.
- **Xác nhận cuối:** backend **115/115**, frontend lint/build, polling **3/3**, sáu browser suites đạt. Backend đã chạy lại toàn bộ sau thay đổi cleanup/error upload cuối; git diff --check đạt. Không chạy lại browser vì các thay đổi cuối chỉ ở backend và browser dùng API mock.
- Giữ nguyên quyết định trước đó về backup.sql và các file cấu hình frontend đang tracked; không sửa lịch sử Git, không push/deploy, không thay cấu hình provider/quota hiện có.

## Rà soát lại sau cập nhật Gmail

- SMTP verify đã thành công với cấu hình hiện tại, không gửi email thử. Nhận xét EAUTH/535 bên dưới là lịch sử trước khi cập nhật credential.
- Backend 90/90, lint/build frontend và polling 3/3 đạt khi chạy lại. Lượt test:all gặp một selector không ổn định trong covers-mobile: cùng nội dung xuất hiện ở tiêu đề sidebar và tin nhắn. Đã giới hạn selector vào paragraph tin nhắn; bộ covers-mobile chạy lại đạt. Không sửa hành vi ứng dụng cho lỗi này.
- Sau sửa selector, ba suite covers-mobile/stability/web-search đều đạt; ba suite UI/UX/chat-history đã đạt trong lượt test:all trước đó. Sáu suite đã được kiểm chứng qua hai lượt, chưa chạy lại nguyên lệnh test:all sau sửa test selector.
- npm audit: backend production 0 lỗ hổng; backend all 2 moderate. Frontend production/all 2 low, 4 moderate. Không có high/critical tại thời điểm kiểm tra.
- test:security vẫn exit1 vì Git theo dõi backup.sql, frontend/.env, frontend/.env.production. Giữ nguyên theo quyết định trước của chủ dự án; chưa đọc nội dung dump hoặc khẳng định tất cả tệp chứa secret.

### Lỗi còn xác nhận từ code/kiểm tra cục bộ

1. **File upload bị bỏ lại (ưu tiên cao về vận hành):** middleware/storageQuota.js cleanup chỉ dọn file khi có storageReservation. Khi quota tắt, upload đã lưu trên Cloudinary nhưng controller trả 400/500 sẽ không xóa file. Kiểm tra bằng EventEmitter response.finish, file giả và mock deleteStoredFile xác nhận số lần dọn bằng 0. updateDocument thay file thành công cũng chỉ dọn ảnh bìa, chưa xóa file gốc cũ; DB đã đổi URL nên file cũ không còn được tham chiếu. Có thể gây tốn dung lượng ngoài phần quota DB tính.
2. **Xóa danh mục có tài liệu trong thùng rác trả 500:** categoryController.js:55 đếm tài liệu với deleted_at:null, nhưng FK Document.category_id vẫn tồn tại cho tài liệu đã xóa mềm. Mock FK P2003 tái hiện HTTP500. Nên kiểm tra cả tài liệu trong thùng rác và trả thông báo nghiệp vụ trước khi xóa.
3. **Lỗi nội bộ có thể lộ qua API/log:** nhiều controller trả error.message trực tiếp trong response 500. Các lỗi Prisma/provider có thể chứa chi tiết triển khai; nên trả thông báo chung và log mã lỗi an toàn. Chưa xác nhận sự cố rò credential thực tế; không in nội dung lỗi provider trong báo cáo.
4. **Bản clone thiếu Google OAuth có thể không khởi động backend:** googleAuthController khởi tạo GoogleStrategy vô điều kiện. Cấu hình hiện tại đã có OAuth nên không gặp lỗi này; nếu muốn chạy chỉ email/password cần cho phép tắt Google và báo 503 rõ ràng ở route Google.
5. **SePay chưa có hạn dùng đơn:** webhook nhận đơn PENDING theo số tiền nhưng không kiểm tra thời hạn. Đây là phần nghiệp vụ chưa triển khai, không phải lỗi dependency hoặc cấu hình Gmail.

Kiểm tra parser PDF bằng PDF tổng hợp cục bộ xác nhận cách gọi hiện tại trích được văn bản với dependency đã cài; không coi đây là lỗi chỉ từ khác biệt ví dụ README.

### Giới hạn kiểm chứng

Chưa chạy đăng ký/OTP có gửi thư thật, OAuth tương tác, upload/download Cloudinary thật hoặc chuyển khoản/webhook từ Internet. Không chạy staging vì chưa có fixture hai tài khoản/môi trường riêng được chỉ định. Script database integration hiện nhắm Linux nên chưa chạy lại PostgreSQL tạm trên Windows. Các kết quả test giả lập không thay thế những bước này.

## Cập nhật sau sửa

- Đã sửa chuẩn hóa đường dẫn trong test loader Windows, bao gồm ánh xạ mock theo đường dẫn và loại node_modules. Backend tests hiện đạt **90/90**, không còn lỗi hoặc ca bị hủy.
- Đã bổ sung đầy đủ các nhóm biến môi trường được dùng cho ứng dụng vào backend/.env.example và hướng dẫn bản clone mới trong LOCAL_TESTING.md. Không sửa giá trị backend/.env.
- Đã sửa scripts/workspace.cjs để chạy executable Node có khoảng trắng trong đường dẫn trên Windows; chỉ dùng shell cho .cmd/.bat.
- `npm run test:all` đạt: backend 90/90, frontend lint, polling 3/3, build và sáu bộ kiểm thử trình duyệt. Các bộ trình duyệt dùng API giả lập; không xác nhận email/OAuth/SePay thật. Bản dist của test dùng API giả lập: cần build lại với cấu hình deployment trước khi xuất bản.
- Gmail SMTP vẫn cần chủ tài khoản cung cấp credential được Gmail chấp nhận; không thể tự tạo App Password từ mã nguồn.

Các kết quả 67/90 và thiếu mẫu môi trường bên dưới là trạng thái trước khi sửa, giữ lại làm bằng chứng chẩn đoán.

Phạm vi: đọc cấu trúc frontend/backend, routes, cấu hình, schema/migrations, scripts và ghi chú bàn giao; chạy build/lint/test và một số kiểm tra dịch vụ thật. Không thay đổi database, gửi email hoặc tạo thanh toán. Không lưu giá trị biến môi trường trong báo cáo.

## Kết quả kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| Working tree trước kiểm tra | Sạch |
| Node hiện tại | 22.14.0, phù hợp engines các dependency đã cài |
| Frontend build | Đạt khi chạy ngoài sandbox; lỗi spawn EPERM ban đầu do giới hạn môi trường |
| Frontend lint | Đạt |
| PostgreSQL | Kết nối được; không có migration trong repo chờ áp dụng |
| Schema | Không thiếu cột scalar theo đối chiếu information_schema; chưa đối chiếu đầy đủ index/constraint |
| Dữ liệu khởi tạo hiện tại | 5 danh mục, 1 admin |
| Tavily | Request thật trả nguồn |
| Gemini | Request thật phản hồi được |
| Web Search kết hợp | 3 nguồn, summaryStatus=ok |
| Cloudinary | API ping thành công; chưa upload/download thật |
| Gmail SMTP | verify thất bại EAUTH/535; không gửi email |
| Backend tests Windows | 90 ca: 67 đạt, 20 lỗi, 3 bị hủy |

TAVILY_API_KEY hiện đã có cấu hình; chẩn đoán thiếu khóa ở lượt trước không còn phản ánh trạng thái hiện tại. Chưa kiểm tra toàn luồng Web Search qua trình duyệt/JWT của người dùng.

## Những phần còn thiếu hoặc cần sửa

1. **Email hoạt động:** kiểm tra EMAIL_USER/EMAIL_PASS và quyền đăng nhập SMTP Gmail. Cần thông tin xác thực được Gmail chấp nhận (App Password nếu tài khoản hỗ trợ). OTP đăng ký/quên mật khẩu phụ thuộc bước này. Việc biến tồn tại không chứng minh credential hợp lệ.
2. **Mẫu môi trường backend đầy đủ:** backend/.env.example hiện chủ yếu có AI/Web Search/quota; thiếu DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL, BACKEND_URL, ALLOWED_ORIGINS, bộ GOOGLE_*, CLOUDINARY_*, EMAIL_* và SEPAY_*. Người clone mới không thể chỉ sao chép mẫu này để cấu hình đủ ứng dụng.
3. **Test loader Windows:** backend/test/helpers.js:20 loại node_modules bằng chuỗi /node_modules/, trong khi Windows dùng dấu gạch chéo ngược. Vì vậy dependency bị nạp vào VM với process giả chỉ có env; xuất hiện lỗi process.stderr.fd và process.versions.node. Cần sửa nhận diện đường dẫn trước khi dùng bộ test này làm tiêu chí hoàn tất trên Windows. Không kết luận mọi ca lỗi đều là lỗi ứng dụng; các ca vẫn lỗi sau sửa cần được phân tích tiếp.
4. **Khởi tạo database mới:** repo không có seed được tìm thấy. npm run setup chỉ cài dependency/generate client, không migrate hoặc tạo admin/danh mục. Database hiện tại đã có dữ liệu nên không cần tự seed hay migrate lại. Với database mới cần quy trình migrate và tạo admin/danh mục rõ ràng.
5. **Google OAuth:** biến hiện có và callback local khớp route; chưa xác minh đăng nhập tương tác hoặc whitelist trong Google Console. Controller khởi tạo GoogleStrategy vô điều kiện nên bản clone thiếu Google client ID có thể không khởi động được backend.
6. **Thanh toán:** SePay có cấu hình nhưng chưa kiểm tra webhook Internet và giao dịch thực. MoMo/VNPay bị vô hiệu hóa rõ ràng trong paymentRoutes.js; thêm khóa không tự bật hai phương thức này. Chưa có cơ chế hết hạn đơn SePay hoàn chỉnh.
7. **File và AI tài liệu:** Cloudinary ping chưa chứng minh upload → duyệt → preview/download → AI đọc file. Cần thực hiện với tài khoản và tài liệu thử, gồm quyền truy cập giữa hai tài khoản.
8. **Kiểm thử/hướng dẫn hệ điều hành:** scripts/test-database.cjs được thiết kế cho Linux/PostgreSQL binaries và Unix socket, chưa phải công cụ chạy trực tiếp trên Windows. LOCAL_TESTING.md có đoạn cũ nói quota AI/storage chưa triển khai; source hiện đã có quota và migration, cần đọc ACCOUNT_QUOTAS.md cùng PROJECT_PROGRESS.md.
9. **Tệp Git:** backup.sql, frontend/.env và frontend/.env.production vẫn đang tracked. .gitignore không loại các tệp đã tracked. Cần rà soát riêng nội dung và cách phân phối cấu hình; lần này không mở dump, sửa lịch sử Git hoặc khẳng định tệp chứa secret.

## Thứ tự để chạy đầy đủ

1. Sửa xác thực Gmail SMTP và kiểm tra đăng ký OTP/quên mật khẩu bằng tài khoản thử.
2. Hoàn thiện .env.example và hướng dẫn khởi tạo cho database mới.
3. Sửa test loader Windows; chạy lại backend tests, sau đó npm run test:all.
4. Chạy npm run dev tại root; kiểm tra OAuth và chuỗi upload/duyệt/xem/tải/chat thật.
5. Xác minh webhook SePay trong môi trường thử trước khi nhận tiền thật.

GROQ_API_KEY chưa có nhưng là fallback tùy chọn, không chặn Gemini/Web Search đã kiểm tra. Không cần bổ sung khóa MoMo/VNPay để chạy luồng hiện tại.
