> Cập nhật 17/10/2026: đã sửa source cho tài khoản, SePay và quyền tài liệu; xem [thay đổi, kiểm thử và các bước triển khai còn lại](SECURITY_CHANGES.md). Các nhận xét bên dưới là ảnh chụp tình trạng trước khi sửa. Backup trong Git và quyền file Cloudinary cũ vẫn cần xử lý khi triển khai.

**Đánh giá DocShare — 14/10/2026**

Project có phạm vi chức năng khá đầy đủ cho một sản phẩm chia sẻ tài liệu: đăng ký OTP, Google OAuth, tìm kiếm/lọc, tải lên, xem trước, bình luận, đánh giá, theo dõi, lưu tài liệu, lịch sử tải, quản trị, kiểm duyệt AI và thanh toán VIP. Tuy nhiên, các lỗi về tài khoản, thanh toán và quyền truy cập tài liệu cần được sửa trước khi dùng với người dùng thật hoặc thu tiền thật.

Phạm vi: rà soát frontend, backend, router/middleware, schema và migrations, cấu hình build/deploy và các luồng liên quan. Đây là đánh giá source và kiểm chứng cục bộ, chưa phải kiểm thử end-to-end trên website đang triển khai. Chưa đo Lighthouse, khả năng truy cập, độ tương phản hoặc hiệu năng cơ sở dữ liệu thực tế. Không gọi dịch vụ thanh toán, email hay AI thật; không chạy migration hoặc thay đổi dữ liệu thật. Không sửa source ứng dụng trong lần đánh giá này.

**Bằng chứng kiểm tra**

- Frontend `npm run build`: thành công. JS chính 1.114,21 kB, gzip 327,75 kB; CSS 118,55 kB, gzip 17,95 kB. Build cảnh báo chunk lớn hơn 500 kB.
- ESLint theo cấu hình hiện tại: 46 errors, 4 warnings. Có 30 lỗi unused variables, 6 empty blocks, 5 set-state-in-effect, 4 warnings dependency của hook và một số lỗi cấu hình/style khác. Không đồng nhất mọi lint error với lỗi runtime.
- `node --check`: cả 26 file JavaScript backend được kiểm tra đều hợp lệ về cú pháp.
- Kiểm chứng controller bằng VM với database/email/provider giả lập, dùng bcrypt/JWT thật với khóa thử nghiệm: xác nhận 7 hành vi gồm ghi đè mật khẩu tài khoản Google, MoMo không chữ ký vẫn kích hoạt VIP, chữ ký VNPay sai vẫn sửa trạng thái đơn, SePay ghép theo số tiền, chủ tài liệu khôi phục tài liệu bị gỡ, thay file vẫn giữ APPROVED, và avatar lưu sai URL.
- Kiểm tra PDF nhỏ tạo cục bộ với bản `pdf-parse` đã cài: cách gọi hiện tại và cách truyền `{ data }` đều đọc được. Không kết luận chức năng PDF bị hỏng chỉ từ khác biệt với ví dụ trong README.
- `backup.sql` đang được Git theo dõi, có 6 dòng User, trong đó 4 dòng có trường password không rỗng và 2 dòng có email verification token không rỗng. Chỉ kiểm tra metadata/số lượng; không đưa giá trị nhạy cảm vào báo cáo. Chưa xác định repo có công khai hay dữ liệu dump là dữ liệu thật hay thử nghiệm.

**P0 — cần xử lý trước khi tiếp tục triển khai**

**01. Luồng đăng ký có thể chiếm quyền tài khoản Google.**

Nguồn: `backend/controllers/googleAuthController.js` (tạo/liên kết user), `backend/controllers/authController.js:18`, `:29`, `:195`, `backend/prisma/schema.prisma`.

Google OAuth không gán `is_email_verified: true`; schema mặc định false. Register cho phép ghi đè tên/mật khẩu của user chưa verified. Login lại bỏ kiểm tra verified nếu có `google_id`. Kết hợp ba điều kiện này, tài khoản Google ở trạng thái đó có thể bị đổi mật khẩu qua đăng ký và đăng nhập bằng mật khẩu vừa đặt mà chưa xác thực OTP. Đã tái hiện với controller và dữ liệu giả lập.

Cần: cấm register ghi đè thông tin đăng nhập của tài khoản đã liên kết OAuth; xác minh thuộc tính email từ Google trước khi đánh dấu verified/liên kết; tách đăng ký chưa hoàn tất khỏi tài khoản đang hoạt động. Rà soát tài khoản hiện có và có cơ chế thu hồi phiên đăng nhập khi sửa lỗi. Không chỉ đổi mặc định của schema vì tài khoản đã tồn tại vẫn bị ảnh hưởng.

**02. MoMo IPN không xác minh chữ ký và thông tin giao dịch.**

Nguồn: `backend/controllers/paymentController.js:92`, `backend/routes/paymentRoutes.js`.

Callback công khai dùng `orderId`, `resultCode`, `transId` để đánh dấu SUCCESS và cấp VIP nhưng không kiểm tra chữ ký, amount hoặc provider của đơn. Đã xác nhận callback không chữ ký vẫn kích hoạt VIP trong mô phỏng.

Cần: xác thực callback theo hợp đồng của provider; đối chiếu đơn hàng, nhà cung cấp và số tiền trước mọi mutation. Không bật thanh toán thật trước khi hoàn tất xác minh và kiểm thử callback giả mạo/lặp.

**P1 — lỗi bảo mật và nghiệp vụ quan trọng**

**03. SePay có thể cấp VIP nhầm tài khoản.**

Nguồn: `backend/controllers/sepayController.js:111`.

Nếu không tìm được mã đơn trong nội dung chuyển khoản, webhook chọn đơn PENDING mới nhất cùng số tiền trong một giờ. Hai người mua cùng gói có thể bị ghép nhầm; cả chuyển khoản không có mã đơn cũng có thể khớp. Đã tái hiện fallback này. Handler cũng chưa kiểm tra loại giao dịch tiền vào và tài khoản nhận.

Cần: chỉ tự động khớp theo định danh đơn chính xác và thông tin nhận tiền đã xác thực. Chuyển giao dịch không khớp sang đối soát thủ công; lưu mã giao dịch duy nhất để chống ghi nhận lại.

**04. Thanh toán và cấp VIP không nằm trong một thao tác nguyên tử.**

Nguồn: `backend/controllers/paymentController.js:105`, `backend/controllers/sepayController.js:148`, các hàm `activateVIP`.

Payment chuyển SUCCESS trước khi cập nhật User. Nếu bước User lỗi, callback lặp bị bỏ qua vì payment đã SUCCESS, khiến người đã thanh toán không được cấp VIP. Callback đồng thời có thể cùng vượt qua kiểm tra trạng thái. SePay trả 200 ngay cả khi xử lý lỗi; MoMo trả 200 trước xử lý nghiệp vụ, nên mất cơ hội retry nếu chưa có hàng đợi bền vững.

Cần: transaction cho chuyển trạng thái đơn và gia hạn VIP, cập nhật có điều kiện PENDING → SUCCESS, ràng buộc duy nhất cho giao dịch provider và cơ chế xử lý retry/đối soát. Không gọi email bên trong transaction kéo dài.

**05. VNPay sửa dữ liệu ngay cả khi chữ ký sai; dựa vào return URL để cấp VIP.**

Nguồn: `backend/controllers/paymentController.js:183`.

Nhánh `signed !== secureHash` vẫn `updateMany(... status: FAILED)`, có thể đổi đơn SUCCESS thành FAILED. Đã tái hiện bằng dữ liệu giả lập. Return URL còn là nơi cấp VIP, nên việc người mua không quay lại trang có thể làm đơn chưa được ghi nhận trong hệ thống. Code cũng chưa đối chiếu amount/provider trước khi cấp VIP.

Cần: chữ ký không hợp lệ thì không sửa đơn; bổ sung luồng xác nhận server-to-server và đối soát theo khả năng provider; chỉ chuyển trạng thái hợp lệ. Việc phát lại callback hợp lệ phải không cộng thêm VIP.

**06. Quyền xem tài liệu không thống nhất giữa các API.**

Nguồn: `backend/routes/documentRoutes.js:71`, `backend/controllers/chatController.js:330`, `backend/controllers/documentController.js:727` và `:758`.

- Proxy chỉ xác minh JWT rồi lấy file theo ID; không kiểm tra tài khoản còn active, trạng thái tài liệu, deleted_at, chủ sở hữu hay quyền admin.
- Chat kiểm tra tài liệu tồn tại rồi trích xuất nội dung, không kiểm tra quyền xem hoặc trạng thái kiểm duyệt/xóa.
- Save cho phép lưu ID không được phép xem; danh sách saved trả nguyên Document và chỉ lọc deleted_at, không lọc APPROVED. Đây là một đường khác để lấy metadata/URL của tài liệu chưa duyệt.
- API bình luận, đánh giá và tải cũng không áp dụng cùng chính sách truy cập như API chi tiết.

Cần: một hàm kiểm tra quyền tài liệu dùng chung cho detail, preview, download, chat, saved và các tương tác. Kiểm tra trước khi truy vấn/trích xuất/trả nội dung, không chỉ ẩn nút ở frontend.

**07. Giới hạn tải FREE/VIP không bảo vệ đường tải file thực tế.**

Nguồn: `backend/middleware/uploadMiddleware.js:57`, `backend/controllers/documentController.js:519`, `frontend/src/pages/DocumentDetail.jsx:214`.

Cloudinary upload public; API public trả file_url; trình duyệt tải trực tiếp URL. API `/download` chỉ tăng bộ đếm, không kiểm soát việc nhận file, nên có thể bỏ qua quota. Ẩn toolbar PDF/chặn chuột phải không ngăn lưu file đã gửi tới trình duyệt. Check quota và tăng lượt cũng chưa nguyên tử; request đồng thời có thể vượt giới hạn. Frontend trừ lượt trước khi fetch file, nên fetch lỗi vẫn mất lượt.

Cần: xác định rõ quyền xem trước và quyền tải. Nếu tải file là quyền có giới hạn, giữ file gốc ở chế độ phù hợp và cấp quyền/link ngắn hạn từ backend sau kiểm tra. Quota phải tăng có điều kiện, nguyên tử; preview nên có chính sách riêng. Không hứa chống sao chép nội dung đã được cấp cho trình duyệt.

**08. Có thể vượt qua quyết định kiểm duyệt.**

Nguồn: `backend/controllers/documentController.js:365`, `:429`, `:154`, `backend/controllers/reportController.js:77`.

- Chủ tài liệu thay file của tài liệu APPROVED mà trạng thái vẫn APPROVED; không kiểm duyệt lại.
- Admin REMOVE chỉ đặt deleted_at. Chủ tài liệu có thể restore và công khai lại tài liệu đang APPROVED. Hai hành vi trên đã được tái hiện.
- AI chạy nền ghi trạng thái theo ID, không kiểm tra tài liệu vẫn là phiên bản/chờ duyệt ban đầu. Kết quả AI về muộn có thể ghi đè quyết định mới của admin.

Cần: tách trạng thái người dùng tự xóa và admin gỡ; người dùng không tự phục hồi tài liệu bị admin gỡ. Thay file/nội dung cần trạng thái và phiên bản kiểm duyệt mới. AI chỉ được cập nhật đúng phiên bản còn PENDING; quyết định admin có ưu tiên rõ ràng.

**09. Dump chứa dữ liệu tài khoản đang nằm trong Git.**

Nguồn: `backup.sql`, các `.gitignore` hiện có.

Đây là rủi ro nếu repo hoặc bản sao repo được chia sẻ. Chưa kết luận đã rò rỉ ra ngoài. Cần di chuyển backup ra nơi lưu trữ có kiểm soát, dùng seed đã làm sạch cho phát triển, kiểm tra phạm vi chia sẻ và lịch sử Git. Nếu dữ liệu thật đã ra ngoài, cần kế hoạch xử lý thông tin xác thực tương ứng. Chỉ thêm gitignore không loại bỏ file đã tracked hoặc lịch sử.

**10. Chưa có giới hạn request cho đăng nhập, OTP, email và AI.**

Nguồn: `backend/routes/authRoutes.js`, `backend/routes/chatRoutes.js`, `backend/index.js`, `backend/controllers/authController.js:26`.

`express-rate-limit` có trong dependencies nhưng chưa được gắn vào các route đã rà soát. OTP dùng Math.random và không có giới hạn lần thử. Cooldown ở Register chỉ chạy phía trình duyệt. AI không có quota theo tài khoản hoặc giới hạn chiều dài từng tin nhắn/history rõ ràng ngoài giới hạn body chung của Express.

Cần: hạn mức theo IP/tài khoản và endpoint; giới hạn lần thử OTP; tạo OTP bằng bộ sinh ngẫu nhiên mật mã; giới hạn đầu vào và ngân sách gọi AI. Chuẩn hóa email và validation kiểu dữ liệu/độ dài ngay ở backend.

**11. Quản lý phiên đăng nhập chưa nhất quán.**

Nguồn: `backend/middleware/authMiddleware.js`, `frontend/src/api/axiosClient.js`, `frontend/src/App.jsx:520`, `backend/routes/googleAuthRoutes.js`.

JWT lỗi/hết hạn trả HTTP 400 trong khi interceptor chỉ xử lý 401/403. App lại xóa token với mọi lỗi `/auth/me`, bao gồm lỗi mạng/server tạm thời. Đổi/reset mật khẩu không thu hồi JWT cũ. Google callback và PDF proxy truyền JWT trong URL, làm tăng bề mặt lưu token vào lịch sử/log.

Cần: phân biệt lỗi xác thực và lỗi hạ tầng; dùng mã lỗi ổn định; trạng thái auth/loading tập trung. Bổ sung cơ chế thu hồi phiên/token version và trao đổi OAuth bằng mã dùng một lần hoặc cơ chế session phù hợp. Proxy cần chính sách cache riêng tư thay cho `Cache-Control: public` đối với nội dung có kiểm soát truy cập.

**12. Trang kết quả thanh toán có thể gọi `/auth/me` lặp liên tục.**

Nguồn: `frontend/src/pages/PaymentResult.jsx:10`, `frontend/src/App.jsx:520`.

Effect phụ thuộc `onPaymentSuccess`; App truyền `fetchUser` được tạo lại sau mỗi render. Callback tải user rồi setUser, tạo function mới và kích hoạt effect lại khi status=success. Đây là vòng lặp có thể suy ra từ luồng state, chưa kiểm chứng trong trình duyệt. Trang cũng coi query `status=success` là thành công, không lấy trạng thái đơn từ server. MoMo redirect về cùng trang nhưng frontend chỉ đọc `status`, không xử lý hợp đồng kết quả của MoMo.

Cần: callback ổn định; lấy trạng thái đơn đã xác thực quyền sở hữu từ backend; trạng thái chờ xác nhận/thành công/thất bại riêng. Hiển thị thành công không được phụ thuộc query tùy ý.

**P2 — sửa chức năng, độ ổn định và hiệu năng**

**13. Avatar và một số link tài liệu sai URL.** Backend updateProfile lưu `/uploads/${file.filename}` dù storage trả Cloudinary URL; đã tái hiện. UserProfile và AdminDashboard ghép API_URL vào cả URL tuyệt đối, làm hỏng avatar Google và file Cloudinary. Cần lưu URL chuẩn và dùng helper thống nhất cho URL tương đối/tuyệt đối. Avatar cần middleware chỉ chấp nhận ảnh, không dùng toàn bộ allowlist tài liệu. Nguồn: `backend/controllers/authController.js:260`, `frontend/src/pages/UserProfile.jsx`, `frontend/src/pages/AdminDashboard.jsx`.

**14. Xác thực email tồn tại hai hợp đồng không khớp.** Register dùng POST `{ email, otp }`, đúng với backend; VerifyEmail lại gọi GET có token không tồn tại. Login có gửi lại OTP nhưng chưa có màn hình nhập OTP ngay trong luồng đó. Cần thống nhất một luồng và cho phép tiếp tục xác thực sau khi reload/rời trang. Nguồn: `frontend/src/pages/VerifyEmail.jsx:14`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/Login.jsx`, `backend/routes/authRoutes.js`.

**15. AdminDashboard đồng bộ state chưa đúng.** Xử lý report chỉ xóa một dòng trong khi backend resolve tất cả report cùng tài liệu; thống kê/trash chưa refresh. Duyệt/từ chối truy cập stats có thể null. Các setState dùng mảng cũ có thể ghi đè kết quả request khác. Phân trang user gọi API ở cả handler và effect. Promise.allSettled chỉ log lỗi khiến tải lỗi hiện thành danh sách trống. Cần trạng thái tải/lỗi theo tab, cập nhật functional, khóa thao tác đang gửi và refresh dữ liệu liên quan. Nguồn: `frontend/src/pages/AdminDashboard.jsx`.

**16. Race condition khi tìm kiếm/chuyển trang/chuyển tài liệu.** Home, AdminDashboard, UserProfile và DocumentDetail chưa hủy/bỏ qua response cũ. Response cũ có thể ghi đè dữ liệu mới. DocumentDetail không xóa doc cũ khi request cho ID mới lỗi, có nguy cơ hiển thị nội dung cũ trong URL mới. ChatBox không reset lịch sử theo documentId. Cần cleanup/request identity và quản lý cache theo query/document ID.

**17. Xử lý thumbnail lỗi lại gây exception.** `Home.jsx:161` truyền `style.bg` chứa nhiều class cách nhau bằng dấu cách vào một đối số của classList.add; DOMTokenList không nhận token chứa khoảng trắng. `nextSibling` cũng là overlay, không phải component fallback mong muốn. Cần render ảnh/fallback bằng state của React, không sửa cấu trúc DOM thủ công.

**18. Đếm lượt xem và thống kê chưa phản ánh hành vi thực.** Nút preview của định dạng được hỗ trợ chỉ toggle state, không gọi `/view`; hàm tăng view dùng cho nhánh không preview được. Endpoint view công khai có thể bị gọi lặp. Biểu đồ admin đếm DownloadHistory, trong khi user được xóa history, làm thay đổi thống kê quá khứ. Cần quy định thế nào là một lượt xem/tải và tách số liệu tổng hợp khỏi lịch sử cá nhân có thể xóa.

**19. Một số thao tác dữ liệu cần transaction và chính sách quan hệ rõ ràng.** Xóa tài liệu vĩnh viễn lần lượt xóa file ngoài rồi nhiều bảng; lỗi giữa chừng có thể để dữ liệu không nhất quán. Xóa category chỉ đếm tài liệu chưa xóa, nhưng tài liệu trong thùng rác vẫn giữ khóa ngoại nên có thể lỗi. Nên transaction phần database và có cơ chế retry việc xóa storage; thống nhất chính sách xóa category có tài liệu trong trash. Nguồn: `documentController.js:455`, `categoryController.js:51`.

**20. Vòng đời file upload còn thiếu.** File được upload lên Cloudinary trước validation/controller và kiểm tra quyền sửa tài liệu. Nhánh return 400/403 không dọn file; sửa file không xử lý file cũ. Public ID dùng Date.now với unique_filename=false có rủi ro trùng khi upload cùng mili giây. MIME do client khai báo chưa đủ để xác định nội dung thật. Cần ID ngẫu nhiên, lưu storage public_id/resource_type, kiểm tra nội dung phù hợp và dọn file thất bại. Lưu metadata gốc thay vì suy đoán public_id từ URL khi xóa.

**21. Query và schema chưa tối ưu cho dữ liệu lớn.** AI admin tải toàn bộ documents rồi JSON.parse/filter/slice trong Node, nên pagination chỉ giới hạn response. MyDocuments, saved, trash, followers và comments có chỗ chưa phân trang. Schema thiếu index rõ ràng cho nhiều truy vấn theo user/status/deleted_at/created_at. Cần phân trang tại DB; tách verdict/confidence/version thành dữ liệu có thể truy vấn; chọn index dựa trên truy vấn và EXPLAIN trên dữ liệu thử nghiệm. API public documents đang trả email người đăng dù giao diện chỉ cần tên; nên giảm trường trả về.

**22. Bundle và tổ chức frontend cần thu gọn.** App import trực tiếp toàn bộ page, kể cả trang admin/chart/chat. Nên lazy-load theo route và tải chat/preview khi cần; sau đó đo lại bundle. Home 818 dòng, AdminDashboard 778, DocumentDetail 752, App 561; nhiều JSX/style và logic gọi API nằm cùng một file. Tách theo tính năng, dùng component chung cho card, dialog, pagination và trạng thái tải/lỗi. Không cần viết lại toàn bộ framework.

**23. AI cần rõ giới hạn và khả năng phục hồi.** Kiểm duyệt chỉ đọc tối đa 3.000 ký tự và chat 30.000, không có xử lý toàn tài liệu/chỉ dẫn vị trí nguồn. Không nên coi confidence do model tự trả là bảo đảm chất lượng. Output cần kiểm tra schema và khoảng giá trị; `parseFloat(...) || 0.8` biến confidence=0 thành 0.8. Cache theo doc ID không theo phiên bản và không giới hạn tổng kích thước; không hủy parser sau khi đọc. Background task trong process không có hàng đợi bền vững. Cần cấu hình model tập trung và kiểm tra khả dụng bằng môi trường thử nghiệm; lần review này chưa gọi provider để xác nhận tên model.

**24. Một số API còn lộ thông tin hoặc xử lý lỗi chưa chính xác.** SePay status chỉ tìm orderId, không kiểm tra payment.user_id với user hiện tại. Nhiều catch trả error.message trực tiếp ra client; auth middleware gộp lỗi DB thành lỗi token. Cần giới hạn trường trả về, kiểm tra quyền sở hữu, log nội bộ với request ID và trả mã lỗi ổn định cho frontend.

**Đánh giá giao diện và trải nghiệm từ source**

Điểm tốt: có hệ màu theo định dạng, bố cục card, breakpoint cho nhiều trang, skeleton/loading, trạng thái rỗng, drag-and-drop upload, tìm kiếm debounce và filter, OTP hỗ trợ dán mã. Các tính năng tạo thành luồng sản phẩm tương đối hoàn chỉnh.

Những thay đổi nên làm:

- Giảm banner trang trí lớn trên các trang thao tác thường xuyên; ưu tiên ô tìm kiếm, danh sách và nút hành động. Giữ gradient/animation ở một số điểm nhấn, kiểm tra trên điện thoại cấu hình thấp.
- Đồng bộ AdminDashboard, UserProfile và các trang khôi phục/xác thực với hệ component đang dùng ở Home/Profile; hiện còn hai phong cách inline CSS và Tailwind.
- CSS đang khai báo cả token HSL và OKLCH cùng tên; một số rule cũ dùng hsl(var(...)) sau khi biến đã đổi thành oklch(...). Chuẩn hóa một hệ token và font; tránh lớp style xung đột.
- Xem trước nên có một hành động chính, tự chọn phương án phù hợp và fallback thân thiện. Nhãn “Máy chủ Proxy”, “Trình xem Trực tiếp” đặt chi tiết triển khai lên người dùng. Không gọi iframe file gốc là cơ chế chống tải.
- Upload nên có tiến trình, trạng thái chờ kiểm duyệt, lỗi có thể thử lại và khả năng giữ nội dung form. Hiện chấp nhận tối đa 20 MB nhưng chỉ hiện trạng thái đang gửi chung.
- Hiển thị rõ lượt tải còn lại và thời điểm reset; quyền VIP phải khớp backend. Register đang hứa tải không giới hạn trong khi FREE có quota; footer hứa tốc độ/phân tích chuyên sâu nhưng chưa thấy phân quyền tương ứng trong code. Ngân hàng ở màn hình QR đang hardcode Sacombank dù backend dùng env.
- Chat theo tài liệu nên dẫn trang/đoạn làm căn cứ và báo rõ khi chưa đọc được file; chat chung nên render Markdown thống nhất với ChatBox. Không hướng dẫn AI khẳng định có dữ liệu trực tiếp khi truy xuất thất bại.
- Bổ sung trạng thái lỗi riêng thay vì dùng màn hình rỗng hoặc spinner vô hạn. Phân biệt không có dữ liệu, không có quyền, không tìm thấy và server tạm lỗi.
- Dialog/menu cần label, điều hướng bàn phím, đóng bằng Escape, quản lý focus; các bảng admin cần cuộn ngang/responsive. Chưa có kiểm thử trình duyệt nên chưa xác nhận mức độ tràn màn hình hay tương phản.
- Đổi `frontend/index.html` từ title “frontend”, lang “en” sang metadata phù hợp tiếng Việt. Bổ sung tiêu đề theo trang, mô tả và preview khi chia sẻ; cân nhắc render/prerender trang public nếu tìm kiếm web là kênh quan trọng.
- Làm rõ mục tiêu sản phẩm: kho tài liệu kỹ thuật nội bộ hay cộng đồng tài liệu công khai. Hiện phân loại Hardware/Software, nội dung quảng bá học tập, thanh toán VIP và chat thời tiết đang cùng tồn tại; nên ưu tiên tìm, đọc và chia sẻ tài liệu trước.

**Thứ tự thực hiện đề xuất**

1. Sửa tài khoản Google, MoMo, SePay/VNPay, tính nguyên tử thanh toán và quyền tài liệu. Đánh giá việc chia sẻ backup. Thêm kiểm thử hồi quy cho các lỗi này trước khi bật luồng thật.
2. Thống nhất vòng đời kiểm duyệt/xóa/khôi phục và quyền tải. Thêm kiểm thử request đồng thời, webhook lặp, file chưa duyệt/bị gỡ và user bị khóa.
3. Sửa avatar/URL, xác thực OTP, auth error handling, PaymentResult và đồng bộ dashboard. Kiểm thử các luồng người dùng chính trên staging với dịch vụ thử nghiệm.
4. Làm sạch lint, tách route/component, giảm bundle, phân trang DB và đo query. Thêm CI chạy lint/build/test; repository hiện chưa có test suite ứng dụng hoặc workflow CI được tìm thấy.
5. Hoàn thiện UX/mobile/accessibility/metadata và khả năng vận hành: tài liệu cài đặt, `.env.example` không chứa bí mật, health/readiness, log lỗi, backup/restore thử nghiệm và hàng đợi tác vụ nền. Backend build hiện có `prisma migrate deploy`; cần tách rõ generate/build và bước migration của release để tránh build vô tình tác động database.

Các kiểm thử tối thiểu nên có: đăng ký không đổi được tài khoản OAuth đã hoạt động; user không xem/chat/save file không có quyền; admin gỡ thì owner không tự công khai lại; thay file phải duyệt lại; webhook giả/lặp/đồng thời không cấp sai VIP; lỗi giữa cập nhật đơn và user có thể retry; quota không vượt do đồng thời; hết hạn token không bị nhầm với mất mạng; thanh toán thành công không gây vòng lặp request; OTP có thể tiếp tục sau reload.

Không cần bổ sung thêm nhiều tính năng lúc này. Giá trị lớn nhất là làm chắc tài khoản, tài liệu, thanh toán và các trạng thái giao diện đã có.
