export const guides = [
  {
    id: "collections",
    title: "Tổ chức bộ sưu tập tài liệu",
    to: "/collections",
    action: "Mở bộ sưu tập",
    steps: [
      "Tab Của tôi chứa bộ sưu tập bạn tạo; tab Đang theo dõi chứa bộ công khai bạn đã theo dõi.",
      "Tạo bộ sưu tập, nhập tên và mô tả. Bộ sưu tập mới mặc định riêng tư.",
      "Bấm Thêm tài liệu để chọn từ tài liệu của tôi hoặc tài liệu đã lưu; cũng có thể thêm ngay trên trang chi tiết tài liệu.",
      "Tìm theo tên hoặc mô tả; xóa từ khóa tìm kiếm để dùng nút lên/xuống sắp xếp tài liệu.",
      "Đổi sang Công khai qua liên kết rồi sao chép liên kết để chia sẻ. Người xem chỉ thấy tài liệu họ có quyền đọc.",
      "Bấm Theo dõi bộ sưu tập trên bộ công khai của người khác để mở lại trong tab Đang theo dõi. Theo dõi bộ không tự theo dõi chủ bộ và không cấp thêm quyền tài liệu.",
      "Khi bộ chuyển riêng tư, chỉ hiện Bộ sưu tập không còn công khai và bạn vẫn có thể bỏ theo dõi; nếu chủ bộ công khai lại, bộ sẽ hiển thị trở lại. Bộ bị xóa tự biến mất khỏi danh sách.",
      "Bỏ tài liệu khỏi bộ sưu tập hoặc xóa bộ sưu tập không xóa tài liệu gốc và không bỏ lưu tài liệu.",
    ],
  },
  {
    id: "following",
    title: "Người theo dõi và đang theo dõi",
    to: "/profile",
    action: "Mở hồ sơ",
    steps: [
      "Dưới thông tin hồ sơ, bấm Người theo dõi để xem ai đang theo dõi bạn; bấm Đang theo dõi để xem những người bạn theo dõi.",
      "Mỗi dòng có ảnh, tên, liên kết hồ sơ và nút theo dõi lại hoặc bỏ theo dõi. Bạn không thể tự theo dõi chính mình.",
      "Trên hồ sơ người khác, danh sách thuộc về người đó nhưng trạng thái và nút thao tác luôn theo tài khoản đang đăng nhập.",
      "Theo dõi là quan hệ một chiều và độc lập với theo dõi bộ sưu tập. Chưa có thông báo cập nhật bộ sưu tập trong phiên bản này.",
    ],
  },
  {
    id: "account",
    title: "Tạo tài khoản và đăng nhập",
    to: "/register",
    action: "Tạo tài khoản",
    steps: [
      "Nhập họ tên, email và mật khẩu ở trang Đăng ký; nhập lại mật khẩu để xác nhận.",
      "Mở email và nhập mã OTP 6 chữ số. Nếu chưa thấy thư, kiểm tra Spam hoặc dùng nút gửi lại khi hết thời gian chờ.",
      "Đăng nhập bằng email/mật khẩu hoặc nút Google. Nếu quên mật khẩu, dùng liên kết khôi phục ở trang đăng nhập.",
    ],
  },
  {
    id: "documents",
    title: "Tìm, xem và lưu tài liệu",
    to: "/documents",
    action: "Khám phá tài liệu",
    steps: [
      "Nhập từ khóa ở thanh tìm kiếm. Lọc theo định dạng, danh mục hoặc ngày; chọn cách sắp xếp phù hợp.",
      "Mở Xem chi tiết để đọc thông tin và chọn xem trực tuyến hoặc tải xuống. Quyền xem và lượt tải phụ thuộc tài khoản, trạng thái tài liệu.",
      "Bấm Lưu tài liệu để xem lại trong Tài liệu đã lưu. Mục Lịch sử tải xuống giúp tìm các tài liệu đã tải.",
    ],
  },
  {
    id: "upload",
    title: "Chia sẻ tài liệu của bạn",
    to: "/upload",
    action: "Tải tài liệu lên",
    steps: [
      "Chuẩn bị tệp bạn có quyền chia sẻ. Tệp được hỗ trợ và dung lượng tối đa 20 MB được hiển thị ở trang tải lên.",
      "Chọn tệp, nhập tiêu đề, mô tả, loại tài liệu và danh mục. Kiểm tra thông tin rồi gửi.",
      "Theo dõi trạng thái trong Tài liệu của tôi. Mở chi tiết tài liệu → Quản lý ảnh bìa tài liệu để chọn JPG, PNG hoặc WebP tối đa 5 MB. Thay ảnh bìa hoặc nội dung cần được duyệt lại.",
    ],
  },
  {
    id: "ai",
    title: "Hỏi AI và tìm thông tin trên web",
    to: "/ai-chat",
    action: "Mở AI Chat",
    steps: [
      "Dùng AI Chat để đặt câu hỏi chung. Để hỏi theo tài liệu, mở trang chi tiết rồi chọn Hỏi AI về tài liệu này.",
      "Đặt câu hỏi cụ thể: tóm tắt một phần, giải thích thuật ngữ hoặc tạo câu hỏi ôn tập. Hội thoại được lưu theo tài khoản sau mỗi câu trả lời thành công. Chọn lịch sử để mở lại, đổi tên hoặc xóa; dùng Tải tin nhắn cũ để xem thêm.",
      "Dùng Web Search để tìm nguồn trên Internet. Mở các trích dẫn để kiểm chứng; nếu AI chưa tạo được tổng hợp, bạn vẫn có thể đọc nguồn tìm được.",
    ],
  },
  {
    id: "vip",
    title: "Gói VIP và chuyển khoản QR",
    to: "/vip",
    action: "Xem các gói VIP",
    steps: [
      "Xem giá và thời hạn đang hiển thị, chọn gói rồi kiểm tra tổng tiền trước khi tiếp tục.",
      "Nếu được người vận hành hướng dẫn thử thanh toán, kiểm tra tài khoản nhận, số tiền và nội dung chuyển khoản trên màn QR. Website thử nghiệm không đồng nghĩa giao dịch ngân hàng là mô phỏng.",
      "Giữ mã đơn và chứng từ. Dùng nút kiểm tra trạng thái khi cần; nếu chưa được xác nhận, đừng tạo thêm giao dịch cho cùng mục đích trước khi đối chiếu.",
    ],
  },
];
export const faqs = [
  [
    "Không nhận được OTP thì làm gì?",
    "Kiểm tra địa chỉ email, thư rác và chờ hết thời gian đếm ngược để gửi lại. Nếu vẫn không nhận được, ghi lại thời điểm và thông báo lỗi để trao đổi với người vận hành bản thử nghiệm.",
  ],
  [
    "Vì sao không tìm thấy tài liệu?",
    "Thử từ khóa ngắn hơn hoặc xóa bộ lọc. Tài liệu chưa được duyệt, đã bị xóa hoặc không được cấp quyền có thể không xuất hiện. Lỗi kết nối sẽ có thông báo và nút Thử lại riêng.",
  ],
  [
    "Tại sao AI không trả lời hoặc không có bản tổng hợp?",
    "Dịch vụ AI có thể tạm lỗi hoặc hết hạn mức. Với Web Search, hãy mở danh sách nguồn nếu đã có kết quả. Khi thử lại, giữ câu hỏi ngắn và rõ; không xem câu trả lời AI là nguồn xác nhận cuối cùng.",
  ],
  [
    "Có thể khôi phục tài liệu đã xóa không?",
    "Mở Thùng rác và chọn Khôi phục nếu thao tác được cho phép. Tài liệu bị quản trị viên gỡ có giới hạn riêng. Xóa vĩnh viễn không có thao tác hoàn tác trong giao diện.",
  ],
  [
    "Xóa lịch sử có hoàn lại lượt tải không?",
    "Xóa lịch sử chỉ dọn danh sách hiển thị; không phải thao tác hoàn lại lượt tải hoặc hủy giao dịch.",
  ],
  [
    "Báo lỗi hoặc báo cáo bản quyền ở đâu?",
    "Trang Hỗ trợ giúp chuẩn bị nội dung gửi cho người vận hành. Bản thử nghiệm chưa công bố email hỗ trợ; sử dụng kênh đã nhận lời mời thử nghiệm, không gửi mật khẩu, OTP hay API key.",
  ],
];
