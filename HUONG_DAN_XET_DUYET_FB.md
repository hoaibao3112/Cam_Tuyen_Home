# Hướng Dẫn Chi Tiết Xét Duyệt Ứng Dụng Facebook (App Review)
### Áp dụng cho tính năng gửi tin nhắn xác nhận đơn hàng qua Messenger cho khách hàng

Để Fanpage của bạn nhắn tin tự động được cho mọi khách hàng lạ (không cần thêm tài khoản Tester), bạn phải hoàn thành hồ sơ xét duyệt ứng dụng trên trang **Facebook Developers**. Dưới đây là hướng dẫn chi tiết từng bước: ấn vào đâu, điền thông tin gì và cách chuẩn bị video gửi duyệt.

---

## BƯỚC 1: Hoàn Thiện Cài Đặt Cơ Bản (App Settings)

Trước khi gửi duyệt, bạn cần điền các thông tin pháp lý cơ bản của ứng dụng.

1.  Tại giao diện Facebook Developer, nhìn sang menu bên trái, nhấp vào **Cài đặt ứng dụng** -> Chọn **Thông tin cơ bản**.
2.  Điền các ô sau:
    *   **Email liên hệ:** Điền email cá nhân hoặc email cửa hàng của bạn.
    *   **Chính sách bảo mật (Privacy Policy URL):** Dán link trang web của bạn vào đây:
        `https://link-menu-y-nu-quan.vercel.app`
    *   **Biểu tượng ứng dụng (App Icon):** Tải lên 1 ảnh vuông bất kỳ làm logo cho app (kích thước tối thiểu `512x512` pixel hoặc `1024x1024` pixel, định dạng PNG/JPG).
    *   **Hạng mục (Category):** Chọn **Mua sắm** (Shopping) hoặc **Doanh nghiệp & Tiện ích** (Business & Utility).
3.  Cuộn xuống dưới cùng và nhấn **Lưu thay đổi**.

---

## BƯỚC 2: Xác Minh Danh Tính Nhà Phát Triển (Verification)

Mục đích để Facebook xác minh bạn là lập trình viên người thật, tránh tài khoản ảo spam.

1.  Nhìn menu bên trái, chọn **Xét duyệt ứng dụng** -> Chọn **Yêu cầu**.
2.  Tại phần **Xác minh**, nhấn nút **Đi đến phần xác minh**.
3.  Chọn **Xác minh cá nhân (Individual/Developer Verification)**.
4.  Facebook sẽ yêu cầu bạn chụp ảnh mặt trước/sau của **Căn cước công dân (CCCD)** hoặc **Hộ chiếu** và tải lên.
5.  Đợi Facebook duyệt danh tính (thường mất từ 30 phút đến vài tiếng).

---

## BƯỚC 3: Đăng Ký Xét Duyệt Quyền Nhắn Tin (`pages_messaging`)

Đây là bước đăng ký quyền gửi tin nhắn tự động từ Fanpage tới người dùng.

1.  Nhìn menu bên trái, chọn **Xét duyệt ứng dụng** -> Chọn **Quyền và tính năng (Permissions and Features)**.
2.  Dùng thanh tìm kiếm, gõ tìm từ khóa: **`pages_messaging`**.
3.  Tại dòng `pages_messaging`, nhìn sang bên phải bấm vào nút **Yêu cầu quyền truy cập nâng cao (Request Advanced Access)**.
4.  Bấm vào nút **Đi đến phần yêu cầu xét duyệt** (thường xuất hiện ở góc trên hoặc dưới trang).

---

## BƯỚC 4: Điền Biểu Mẫu Thuyết Minh Cho Facebook

Facebook sẽ hiện ra các câu hỏi thuyết minh bằng tiếng Anh hoặc tiếng Việt. Bạn hãy copy-paste câu trả lời mẫu dưới đây (đã viết sẵn song ngữ Anh - Việt để kiểm duyệt viên của Facebook dễ đọc nhất):

### Câu hỏi 1: Mô tả tính năng này được sử dụng như thế nào? (How is this feature used?)
> **Nội dung điền:**
> Ứng dụng này giúp gửi tin nhắn tự động xác nhận đơn hàng cho khách hàng khi họ đặt hàng trên trang web của chúng tôi. Khi khách hàng đặt món thành công trên trang web và bấm vào nút 'Xác nhận qua Messenger', hệ thống sẽ gửi một tin nhắn tự động vào Messenger của khách hàng chứa: mã đơn hàng, danh sách món ăn, địa chỉ nhận hàng và tổng số tiền thanh toán để khách hàng kiểm tra lại thông tin.
> 
> (This app automatically sends order confirmation messages to customers when they place an order on our website. After completing an order on the website, customers click the 'Confirm via Messenger' button. Our system then sends an automated message to the customer's Messenger containing the order code, items list, delivery address, and total price so they can verify their order details.)

### Câu hỏi 2: Cách bạn xử lý dữ liệu người dùng? (How do you handle user data?)
> **Nội dung điền:**
> Chúng tôi chỉ sử dụng quyền nhắn tin (pages_messaging) duy nhất cho mục đích gửi tin nhắn xác nhận đơn hàng được tạo từ trang web. Chúng tôi cam kết không lưu trữ hoặc chia sẻ bất kỳ thông tin cá nhân nhạy cảm nào ngoài các thông tin đơn hàng cơ bản do khách hàng chủ động cung cấp khi đặt hàng.
> 
> (We only use the pages_messaging permission for the sole purpose of sending order confirmation messages generated from our website. We commit to not storing or sharing any sensitive personal information other than the basic order details voluntarily provided by the customer during checkout.)

---

## BƯỚC 5: Tải Lên Video Demo Chạy Thử (Screencast)

Facebook **bắt buộc** bạn phải tải lên 1 video quay màn hình chứng minh tính năng hoạt động thực tế.

### Hướng dẫn quay video:
1.  Sử dụng một điện thoại hoặc máy tính có đăng nhập tài khoản **Facebook phụ đã được thêm làm Tester** ở Bước 2.
2.  Mở phần mềm quay video màn hình (OBS, Loom hoặc quay trực tiếp bằng điện thoại).
3.  **Bắt đầu quay:**
    *   Mở trang web đặt món của bạn: `https://link-menu-y-nu-quan.vercel.app/menu/quan-test`
    *   Thao tác chọn vài món ăn vào giỏ hàng.
    *   Vào giỏ hàng, điền thông tin đặt hàng (Tên: Nguyễn Văn A, SĐT, Địa chỉ).
    *   Nhấn **Đặt hàng**. Website hiển thị màn hình "Đặt hàng thành công".
    *   Nhấp vào nút **"Xác nhận qua Messenger"**.
    *   Trang web sẽ tự động mở hộp thoại Messenger với Fanpage của bạn.
    *   Đợi 1-2 giây, màn hình hiển thị tin nhắn chatbot tự động gửi đến chứa đầy đủ thông tin đơn hàng vừa đặt.
4.  **Lưu video:** Lưu video dưới dạng định dạng `.mp4` hoặc `.mov` (dung lượng dưới 100MB) và tải lên ô yêu cầu của Facebook.

---

## BƯỚC 6: Gửi Duyệt & Chờ Kết Quả

1.  Kiểm tra lại tất cả các mục trên trang checklist đã có tích xanh.
2.  Bấm vào nút **Gửi để xét duyệt (Submit for Review)** ở cuối trang.
3.  Đợi kết quả từ Facebook gửi về email đăng ký tài khoản của bạn (thường mất 1 - 3 ngày). Khi được phê duyệt, bạn chỉ cần gạt công tắc ứng dụng sang **Chính thức (Live Mode)** là khách hàng thật có thể sử dụng được ngay.
