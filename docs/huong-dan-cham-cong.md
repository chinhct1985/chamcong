# Hướng dẫn sử dụng — Chấm công

Tài liệu mô tả cách nhân viên dùng trang chấm công sau khi đăng nhập (trang chủ `/`) và phần bổ sung dành cho **tài khoản quản lý**.

---

## 1. Đăng nhập và thông tin hiển thị

- Truy cập **Đăng nhập** (`/login`), nhập **số điện thoại** và **mật khẩu** do quản trị cấp (hoặc tài khoản đã đăng ký).
- Trên đầu trang hiển thị **họ tên**, **loại nhân viên** (nếu được gán), **số điện thoại**. Nút **Đăng xuất** kết thúc phiên trên trình duyệt này.

---

## 2. Gửi bản ghi chấm công

### 2.1. Chọn ngày

- Dùng **lịch** (tuần bắt đầu từ **Thứ Hai**): bấm vào từng **ngày** để **bật/tắt** (ngày được chọn tô màu).
- Có thể chọn **nhiều ngày** trong cùng một lần gửi.
- Dùng **‹ Tháng trước** / **Tháng sau ›** để xem tháng khác khi cần.
- Các ngày đã chọn hiện ở khối **Ngày đã chọn**; có thể bấm **×** bên cạnh một ngày để bỏ ngày đó khỏi danh sách gửi.

### 2.2. Chọn loại chấm công (Loại CC)

- **Combobox 1**: bắt buộc chọn **ít nhất một** loại (mã · tên do quản trị cấu hình).
- **Combobox 2**: tùy chọn — chỉ dùng khi trong **cùng một lần gửi** bạn cần ghi nhận **hai loại** cho **cùng các ngày đã chọn**.

**Quy tắc hai loại**

- Nếu chỉ chọn **một** loại: hệ thống ghi nhận loại đó cho từng ngày đã chọn (giá trị nguyên theo quy ước mã, ví dụ **P**, **No**…).
- Nếu chọn **hai** loại **khác nhau**: mỗi ngày sẽ có **hai bản ghi** (một cho mỗi loại), và mã hiển thị kèm hậu tố **`/2`** để thể hiện **một nửa** giá trị so với cả ngày (ví dụ cặp **P/2** cho từng loại khi áp dụng quy tắc nửa ngày).
- **Không** được chọn trùng một loại ở cả hai combobox.

### 2.3. Gửi

- Bấm **Gửi**. Khi thành công, hệ thống thông báo số bản ghi đã lưu và làm mới dữ liệu **Trong tháng** (theo tháng/năm đang lọc phía dưới).

### 2.4. Lưu ý quan trọng — gửi lại cùng ngày

- Với **mỗi ngày** nằm trong lần gửi, hệ thống **xóa toàn bộ chấm công cũ của ngày đó** rồi **ghi lại** theo **các loại** bạn chọn trong lần gửi hiện tại.
- Nếu bạn chỉ muốn sửa một ngày, nên **chỉ tích ngày đó** (và chọn đúng loại) rồi gửi, tránh tích nhầm nhiều ngày sẽ cập nhật hết các ngày đó.

---

## 3. Xem lịch sử trong tháng (Trong tháng)

- Chọn **Tháng** và **Năm**, danh sách bên dười cập nhật (có trạng thái **Đang tải…** khi đổi tháng/năm).
- Bảng hiển thị **Ngày**, **Mã**, **Tên** theo từng bản ghi đã lưu trong tháng đó.
- Phần lọc tháng/năm **độc lập** với lịch chọn ngày phía trên: bạn có thể gửi chấm công cho tháng này nhưng xem lại tháng khác bằng cách đổi **Tháng / Năm** ở đây.

---

## 4. Dành cho tài khoản quản lý

Chỉ khi tài khoản được đánh dấu **quản lý** (`isManager`), trên khối **Trong tháng** mới có thêm:

| Nút | Ý nghĩa |
|-----|--------|
| **Xuất Excel** | Tải file bảng chấm công theo **tháng/năm** đang chọn (tổng hợp nhân viên / ma trận ngày — định dạng do hệ thống xuất). |
| **Xuất log (Excel)** | Tải file log các lần gửi chấm công thành công trong tháng (phục vụ đối soát). |

- Nếu không thấy hai nút này, tài khoản không có quyền quản lý — cần liên hệ quản trị.
- Quản trị viên vào **trang admin** có thể bấm vào **số điện thoại** trên header (khi là quản lý) hoặc dùng URL quản trị đã được cấp.

---

## 5. Đăng ký tài khoản (nếu được bật)

- Trang **Đăng ký** (`/register`): nhập họ tên, số điện thoại, mật khẩu và **loại nhân viên**.
- Sau khi đăng ký thành công, **đăng nhập** bằng số điện thoại vừa dùng.
- Việc cấu hình **Danh mục loại chấm công**, **khóa/mở tài khoản**, **phân quyền quản lý** do **quản trị** thực hiện trong phần hành chính — không nằm trong hướng dẫn chi tiết tại đây.

---

## 6. Gợi ý khắc phục sự cố thường gặp

| Hiện tượng | Gợi ý |
|------------|--------|
| Báo hết phiên / yêu cầu đăng nhập lại | Đăng nhập lại; không dùng chế độ ẩn danh nếu cần lưu cookie phiên. |
| Không có loại trong combobox («Chưa có Loại CC») | Quản trị cần thêm và bật các **Loại CC** trong danh mục. |
| Không gửi được / lỗi mạng | Kiểm tra kết nối; thử lại; nếu lỗi lặp lại, chụp thông báo và báo IT. |

---

*Tài liệu căn cứ chức năng trong mã nguồn ứng dụng ChamCong (`HomeForm`, API `/api/submit`, `/api/attendance/month`).*

*Bản hiển thị trong cửa sổ «Hướng dẫn» trên trang chủ được giữ khớp với nội dung trong `components/AttendanceHelpModal.tsx`.*
