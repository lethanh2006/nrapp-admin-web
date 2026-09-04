# NRApp Admin Web

Cổng quản trị độc lập xây dựng bằng Next.js 16, React 19 và TypeScript. Ứng dụng dùng NRApp Gateway làm nguồn dữ liệu thật và không còn phụ thuộc vào dữ liệu tĩnh cục bộ.

## Khởi chạy

Yêu cầu Node.js 20.9 trở lên.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) và đăng nhập bằng tài khoản NRApp có vai trò `admin`. Giới hạn này bảo đảm mọi khu vực quản trị đều khớp quyền của các endpoint backend. Luồng đăng nhập gồm email/mật khẩu và OTP gửi qua email.

Mặc định BFF kết nối tới `https://api.thanhlelmtp2006.id.vn/api`. Có thể đổi bằng biến môi trường `NRAPP_API_URL`; tài liệu endpoint nằm tại [NRApp Swagger](https://api.thanhlelmtp2006.id.vn/api-docs).

## Kiến trúc tích hợp

- Trình duyệt chỉ gọi các route cùng origin trong `app/api`; access token và refresh token nằm trong cookie `HttpOnly`.
- BFF tự làm mới access token khi Gateway trả về `401` và không đưa token vào JavaScript phía client.
- Gateway proxy chỉ cho phép các nhóm API NRApp đã khai báo: auth, user, todo, workschedule, canteen, payment và chat.
- Dashboard, lịch/chấm công, công việc, nhân sự, căn tin, chat, tiện ích và hồ sơ đều đọc hoặc ghi qua API thật.
- Những khả năng backend chưa có endpoint tương ứng (đổi mật khẩu, tải avatar, gọi thoại/video, upload ảnh chat từ BFF JSON) được vô hiệu hóa và ghi chú rõ trên giao diện.

## Các route chính

- `/dashboard`: KPI và hoạt động tổng hợp từ các API nghiệp vụ.
- `/lich-lam`: duyệt lịch, duyệt đơn từ, tạo token QR và báo cáo chấm công.
- `/cong-viec`: đọc, tạo và cập nhật trạng thái công việc.
- `/can-tin`: đơn hàng, bếp, thực đơn, kho và thống kê.
- `/nhan-su`: danh bạ, tạo tài khoản và cập nhật vai trò.
- `/tro-chuyen`: tải hội thoại, đọc và gửi tin nhắn văn bản.
- `/tien-ich`: số liệu tổng hợp và trạng thái phản hồi của các API chính.
- `/ho-so`: cập nhật tên/email, đăng xuất và xóa tài khoản.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```
