# NRApp Admin Web

Dự án admin web độc lập xây dựng bằng Next.js 16, React 19 và TypeScript. Giao diện kế thừa nhận diện của khu vực quản trị trong `Nrapp` (tông đỏ, nền slate, card bo lớn), sau đó được tổ chức lại theo trải nghiệm dashboard desktop và responsive mobile.

Mã nguồn này không import, liên kết hay ghi vào dự án `Nrapp`. Hai asset nhận diện cần dùng đã được sao chép vào `public/images`.

## Khởi chạy

Yêu cầu Node.js 20.9 trở lên.

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Trang đăng nhập demo nằm tại [http://localhost:3000/dang-nhap](http://localhost:3000/dang-nhap); tài khoản mẫu đã được điền sẵn.

## Các khu vực giao diện

- `/dashboard`: bảng điều hành, KPI, biểu đồ chấm công, yêu cầu cần duyệt.
- `/lich-lam`: lịch làm, duyệt đơn, QR chấm công, chính sách và báo cáo.
- `/cong-viec`: tìm kiếm/lọc, cập nhật tiến độ và tạo công việc mới.
- `/can-tin`: đơn hàng, bếp, thực đơn, kho và thống kê.
- `/nhan-su`: danh bạ, lọc nhân sự, xem/chỉnh sửa/thêm hồ sơ.
- `/tro-chuyen`: danh sách hội thoại và gửi tin nhắn cục bộ.
- `/tien-ich`: trung tâm công cụ và trạng thái hệ thống.
- `/ho-so`: hồ sơ, bảo mật, phiên đăng nhập và tùy chọn thông báo.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```

## Dữ liệu và tích hợp

Dữ liệu hiện tại nằm trong `lib/mock-data.ts` và các thao tác cập nhật state cục bộ để có thể xem, lọc, tạo và thử luồng giao diện mà không cần backend. Khi tích hợp thật, có thể thay lớp mock bằng API Gateway của hệ thống hiện có và bổ sung auth guard/session ở layout quản trị.
