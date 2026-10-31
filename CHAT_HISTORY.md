# Lịch sử AI Chat

Triển khai ngày 30/10/2026 theo yêu cầu lưu hội thoại lâu dài. Dùng backend Node/Express và PostgreSQL hiện có; không cần dịch vụ lưu trữ hoặc server AI riêng.

## Sử dụng

- Mở `/ai-chat`, gửi câu hỏi. Sau khi AI trả lời thành công, câu hỏi/câu trả lời được lưu cùng nhau; URL chứa `?conversation=<id>` để mở lại.
- Lịch sử được phân trang 30 hội thoại; mở một hội thoại lấy 50 tin nhắn gần nhất, nút “Tải tin nhắn cũ” lấy trang trước.
- Có tạo hội thoại mới, đổi tên và xóa vĩnh viễn hội thoại cùng tin nhắn. Mỗi tài khoản chỉ truy cập lịch sử của mình.
- Nút hỏi AI ở chi tiết tài liệu mở cùng trang chat với `?document=<id>`. Các điểm vào chat đều dùng giao diện lưu trữ này; không còn widget tạo một lịch sử riêng chỉ nằm trong RAM.
- Nếu AI thất bại, không ghi cặp tin nhắn chưa hoàn thành; câu hỏi giữ trong ô nhập để gửi lại. Nếu mất phản hồi mạng sau khi đã lưu, gửi lại cùng yêu cầu trong phiên hiện tại sẽ trả kết quả đã lưu, không thêm bản sao.
- Hội thoại chưa hoàn tất có thể xuất hiện rỗng trong lịch sử; có thể mở/xóa. Tin nhắn cũ chỉ nằm trong RAM trước tính năng này không thể tự khôi phục.

## Cơ sở dữ liệu và vận hành

`Conversation`: chủ sở hữu, tài liệu liên quan (tùy chọn), tiêu đề, thời gian, khóa xử lý có hạn 10 phút.
`ChatMessage`: vai trò user/assistant, nội dung, thời gian, mã yêu cầu; unique (conversation_id, request_id, role), index để phân trang.

Migration `20261030090000_chat_history` đã áp dụng thành công vào PostgreSQL đang cấu hình trong môi trường làm việc. Prisma Client đã generate. Migration chỉ tạo bảng/index/FK mới, không xóa hay chuyển đổi dữ liệu cũ. Khi triển khai sang môi trường khác, chạy trong backend:

```sh
npx prisma generate
npx prisma migrate deploy
```

Khởi động lại tiến trình backend nếu nó vẫn giữ Prisma Client cũ; triển khai source backend và frontend cùng phiên bản. Không tự deploy dịch vụ hosting trong tác vụ này.

Lịch sử được giữ đến khi người dùng xóa; chưa có tự động xóa theo ngày hay giới hạn tổng dung lượng từng tài khoản. Xóa tài khoản hoặc xóa vĩnh viễn tài liệu sẽ cascade xóa hội thoại liên quan. Tài liệu bị soft-delete/thu hồi quyền khiến lịch sử liên quan không đọc/hỏi tiếp được, nhưng chủ hội thoại vẫn có thể xóa nó. Bản sao lưu database nằm ngoài thao tác xóa trong UI, cần quản lý theo chính sách vận hành.

Không lưu thêm một bản tài liệu trong mỗi hội thoại. Chỉ 10 tin nhắn gần nhất từ database được gửi làm ngữ cảnh AI, không tin `history` do client gửi. Nội dung từng tin nhắn ngữ cảnh được giới hạn 16.000 ký tự. Câu hỏi tối đa 8.000 ký tự; câu trả lời lưu tối đa 64.000 ký tự. Mở/xem/đổi tên/xóa lịch sử không gọi AI. Không có tóm tắt lịch sử dài tự động.

## API mới (JWT bắt buộc)

- `GET /api/chat/conversations?page=1` → `{conversations, hasMore}`.
- `POST /api/chat/conversations` body `{title?, documentId?}` → hội thoại mới.
- `GET /api/chat/conversations/:id/messages?before=<messageId>` → `{conversation, messages, hasMore}`; messages theo thứ tự cũ → mới.
- `PATCH /api/chat/conversations/:id` body `{title}`.
- `DELETE /api/chat/conversations/:id`.
- `POST /api/chat/conversations/:id/messages` body `{message, requestId}` (requestId UUID) → `{messages: [user, assistant]}`.

API tạo/gửi dùng rate limiter AI hiện có. Giữ các POST `/chat/general` và `/chat/:docId` cũ để tương thích; chúng vẫn stateless, frontend mới không gọi trực tiếp. Controller lịch sử tái sử dụng handler AI hiện có nên không thay provider, model hoặc khóa API.

Trước khi đọc/hỏi lại hội thoại tài liệu, kiểm tra quyền tài liệu; kiểm tra lại trước khi lưu câu trả lời. Conditional update khóa conversation chống gửi đồng thời giữa nhiều tiến trình. Ghi cặp tin nhắn trong transaction, không giữ transaction trong khi chờ AI. Khóa tự hết hạn sau 10 phút nếu tiến trình chết; request cũ không được ghi nếu đã mất khóa. Xóa hội thoại trong khi đang sinh câu trả lời không tạo lại dữ liệu.

## Kiểm chứng

- `npm test` tại backend: 64/64 đạt, có 9 kiểm thử mới về quyền sở hữu, quyền tài liệu bị thu hồi, ngữ cảnh từ DB, retry/idempotency, đồng thời, lỗi AI, xóa khi đang sinh và phân trang.
- `node scripts/check-chat-storage.js` tại backend: kiểm tra PostgreSQL thật create/read/order/lock/cascade trong transaction rollback, không để lại dữ liệu test, không gọi AI.
- `frontend/test/chat-history.browser.cjs`: API mock có lưu trạng thái qua reload, kiểm tra tạo, mở lại, đổi tên, retry, tách hội thoại, phân trang, xóa, khôi phục tài liệu và responsive 1440/768/375.
- `frontend/test/docshare-ui.browser.cjs`: regression 10 trang × 3 viewport và luồng API đạt với fixture chat mới.
- Build frontend đạt; bundle chính vẫn >500 kB. Lint file chat thay đổi không có lỗi/cảnh báo.
- Chưa gọi Gemini/Groq thật trong lượt kiểm thử này; không chi tiền API AI để kiểm thử lưu trữ.


## Cập nhật độ ổn định — 30/10/2026

Handler AI có deadline tổng 45 giây (Gemini tối đa 20 giây mỗi attempt), AbortSignal truyền tới provider và request phụ trợ. Timeout trả 504 và giữ câu hỏi trong ô nhập để thử lại; không lưu cặp tin nhắn chưa hoàn thành. Lease DB 10 phút vẫn chỉ là phương án khôi phục khi tiến trình chết, không phải thời gian chờ AI thông thường. Khi mất HTTP response, frontend thử đọc lại tin nhắn đã lưu theo request ID; không gọi AI để đọc lịch sử. Kiểm thử deadline/provider signal và mất response đã bổ sung. Xem kết quả mới nhất trong QUALITY_REVIEW.md.


## UX tiếp theo

Mobile có nút mở/thu gọn lịch sử và tác vụ; tìm tên hội thoại qua query `search` (tối đa 120 ký tự, giới hạn chủ sở hữu); câu hỏi đang gửi hiển thị ngay nhưng chưa được đánh dấu đã lưu. Xem `DOCUMENT_COVERS.md` và cập nhật cuối PROJECT_PROGRESS.md.
