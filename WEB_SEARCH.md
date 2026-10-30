# DocShare Web Search

## Thiết kế và tích hợp

- Trang `/web-search` dùng AppShell (header/sidebar dùng chung), ProtectedRoute và axiosClient; AI Chat dẫn tới `/ai-chat`, Quản trị chỉ hiện cho ADMIN. Giao diện theo ảnh tham chiếu được mô tả trong UI_REDESIGN.md.
- POST `/api/web-search` chạy JWT middleware hiện có (kiểm tra tài khoản và phiên trong database), rồi giới hạn 10 request/phút/user.
- Tavily REST Search: `topic=general|news`, `search_depth=basic`, tối đa 10 nguồn. Không giả lập bộ lọc Bài viết/Học thuật vì API không có topic tương ứng. Không có dữ liệu Figma trong yêu cầu đính kèm; giao diện theo hệ màu và phong cách source hiện tại.
- Web Search dùng Gemini REST generateContent với GEMINI_API_KEY đang dùng cho AI Chat. Model chọn qua GEMINI_WEB_SEARCH_MODEL, mặc định gemini-3.5-flash-lite giống lựa chọn đầu tiên của Chat hiện tại. AI Chat vẫn giữ nguyên cơ chế Gemini/Groq riêng.
- Chuẩn hóa URL HTTP(S), bỏ credentials, fragment và tracking parameters, loại trùng; không fetch các URL kết quả trên server. UI chỉ render văn bản, không thực thi HTML/Markdown của provider.
- Mỗi nguồn tối đa 1.500 ký tự nội dung + 300 ký tự tiêu đề, tối đa 10 nguồn; output Gemini 1.600 token. Prompt phân biệt dữ liệu web với chỉ dẫn và yêu cầu trích dẫn.
- Kiểm tra mọi mã dạng `[n]`: mã không tồn tại, thiếu trích dẫn hoặc URL trong summary khiến bỏ toàn bộ summary. Đây là kiểm tra cấu trúc trích dẫn, không chứng minh tính đúng đắn của mọi nhận định; UI nhắc đối chiếu nguồn.
- Tavily timeout 15 giây, Gemini 25 giây. Gemini lỗi vẫn trả nguồn thật. Hủy hoặc rời trang abort request và lan truyền tín hiệu hủy đến provider khi kết nối đóng; không bảo đảm provider hoàn lại chi phí đã xử lý.
- Cache RAM 60 giây, tối đa 100 entry, tách theo user/query/category/limit; không cache lỗi summary. Không log query, khóa API hoặc nội dung lỗi provider. Response có `Cache-Control: no-store`.
- Rate limit và cache áp dụng trong một process. Khi chạy nhiều replica, cần store dùng chung (ví dụ Redis) cho quota toàn hệ thống.

## Cấu hình và chạy

Giữ nguyên cấu hình database/JWT/OAuth của dự án. Bổ sung các biến từ `backend/.env.example` vào `backend/.env`:

```dotenv
TAVILY_API_KEY=your_tavily_key
GEMINI_API_KEY=your_existing_gemini_key
GEMINI_WEB_SEARCH_MODEL=gemini-3.5-flash-lite
```

Giữ giá trị GEMINI_API_KEY đang có, không ghi đè bằng giá trị mẫu. Chọn model khả dụng cho project Gemini qua GEMINI_WEB_SEARCH_MODEL; biến này chỉ áp dụng Web Search. Không đưa khóa provider vào biến VITE_*. Web Search không cần GROQ_API_KEY. Gemini bị chặn, trả rỗng hoặc kết thúc do hết token sẽ được xử lý như không tạo được summary, vẫn giữ nguồn Tavily.

Frontend dùng `VITE_API_URL=http://localhost:5000` như `frontend/.env.example`. Cấu hình backend `ALLOWED_ORIGINS` phù hợp origin frontend hiện tại.

```bash
cd backend
npm ci
npm run dev
```

Trong terminal khác:

```bash
cd frontend
npm ci
npm run dev
```

Đăng nhập tài khoản đã xác thực, mở `/web-search`. Không cần migration hay dependency runtime mới cho tính năng này.

## API

```json
{ "query": "Ứng dụng AI trong giáo dục đại học", "category": "all", "limit": 10 }
```

Query 1–500 ký tự; category `all` hoặc `news`; limit số nguyên 1–10. Response có `success`, `query`, `category`, `limit`, `summary`, `summaryStatus`, `sources`, `total`. `total` là số nguồn được trả về, không phải tổng số kết quả trên Internet. Source có `id`, `title`, `url`, `snippet`, `source`, `publishedAt` (null khi không có ngày hợp lệ).

`summaryStatus`: `ok`, `insufficient_sources`, `unavailable`. HTTP 400 cho input sai, 401/403 theo auth hiện có, 429 cho quota user, 504 Tavily timeout, 502/503 cho lỗi provider. Không trả nguyên lỗi/khóa của provider.

## Kiểm thử

```bash
cd backend
npm test
# Chỉ Web Search:
node --test test/web-search.test.js
```

HTTP tests dùng Express/JWT/rate limiter thật và mock database/provider; không tốn quota hoặc cần database thật. Có kiểm tra thành công, input rỗng/quá dài, bộ lọc, không có nguồn, Tavily timeout/rate limit, Gemini lỗi, thiếu JWT, quota theo user, URL trùng/không an toàn, mã tham khảo sai, cache theo user và hủy upstream.

```bash
cd frontend
npm run build
npx eslint src/pages/WebSearch.jsx src/components/GlobalChatBox.jsx
```

Kiểm tra thủ công với khóa thật: tìm kiếm tiếng Việt cả hai bộ lọc; mở nguồn từ summary; kiểm tra tài khoản thường/admin; viewport 375px, 768px, 1440px; nhấn Enter; hủy khi mạng chậm; chuyển trang khi đang tìm rồi quay lại; lỗi 429/timeout; bỏ GEMINI_API_KEY để xác nhận nguồn vẫn hiển thị. Không giả kết quả khi thiếu TAVILY_API_KEY.

## File

Tạo: `backend/services/groq.service.js`, `gemini.service.js`, `tavily.service.js`, `aiSummary.service.js`; `backend/controllers/webSearchController.js`; `backend/routes/webSearchRoutes.js`; `backend/test/web-search.test.js`, `backend/test/gemini-service.test.js`; `frontend/src/pages/WebSearch.jsx`, `WebSearch.css`; hai `.env.example`; tài liệu này.

Sửa: `backend/index.js` (mount route), `backend/controllers/chatController.js` (dùng chung Groq), `backend/test/helpers.js` (AbortController cho môi trường VM), `frontend/src/App.jsx` (route/nav và mở Chat), `frontend/src/components/GlobalChatBox.jsx` (nhận yêu cầu mở từ sidebar).

## Tài liệu provider

- Tavily Search: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Gemini generateContent: https://ai.google.dev/api/generate-content

## Kết quả kiểm chứng cục bộ

- Backend: 55/55 tests đạt, gồm 10 test Web Search và 3 test Gemini service.
- Frontend build thành công; còn cảnh báo bundle lớn hơn 500 kB của ứng dụng.
- ESLint hai component tính năng đạt.
- Chrome headless với API mock: 375/768/1440 px không tràn ngang; Enter, trích dẫn, empty/error/AI fallback, hủy request và chuyển trang đạt. Test ở `frontend/test/web-search.browser.cjs`.
- Sau khi đổi sang Gemini: backend tests đã chạy lại; frontend không đổi. Kết quả build/browser ở trên thuộc lần triển khai giao diện trước. Chưa xác minh end-to-end với Tavily/Gemini thật; các test dùng provider mock không khẳng định quyền truy cập model của project.

Chạy lại browser test (cần Chrome; có thể đặt `CHROME_PATH` và `TEST_BASE_URL`):

```bash
npm install --prefix /tmp/docshare-web-test playwright
# Chạy frontend npm run dev trong terminal riêng, sau đó từ thư mục gốc:
PLAYWRIGHT_MODULE=/tmp/docshare-web-test/node_modules/playwright node frontend/test/web-search.browser.cjs
```

Không cần cài Playwright vào dependency production. Test chặn API bằng mock, không cần đăng nhập thật.


## Tạo khóa Tavily

1. Mở https://app.tavily.com/ và đăng ký hoặc đăng nhập.
2. Trong dashboard, mở phần API Keys; sao chép khóa có sẵn hoặc tạo khóa mới cho DocShare.
3. Thêm `TAVILY_API_KEY=khóa_của_bạn` vào `backend/.env`. Giữ nguyên `GEMINI_API_KEY` hiện có.
4. Khởi động lại backend bằng `npm run dev` (hoặc restart dịch vụ đang chạy); đăng nhập DocShare và mở `/web-search` để thử.
5. Xem usage/credits trong dashboard Tavily khi cần theo dõi lượt sử dụng. Không đưa khóa vào frontend hoặc commit Git.

Tài liệu chính thức: https://docs.tavily.com/ (Get API key). Không cần cài SDK Tavily, source đã gọi REST API bằng axios.
