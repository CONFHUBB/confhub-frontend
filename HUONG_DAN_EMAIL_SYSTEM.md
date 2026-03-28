# Hướng Dẫn Sử Dụng & Test Hệ Thống Email CMT3

## Tổng quan các màn hình mới

### 1. Trang quản lý email: `/conference/[conferenceId]/email`
**Đối tượng**: Conference Chair / Program Chair

Trang này có 3 tab:

| Tab | Chức năng |
|-----|-----------|
| **Invitations** | Xem tất cả lời mời đã gửi (pending/accepted/declined/expired), nút Resend để gửi lại email |
| **Bulk Email** | Soạn email hàng loạt gửi cho nhóm (All Reviewers, All Authors, v.v.), hỗ trợ placeholder |
| **History** | Lịch sử tất cả email đã gửi với trạng thái SENT/ERROR |

### 2. Trang phản hồi invitation (từ email)
Khi người nhận click link trong email, họ sẽ được redirect đến:

| URL | Mô tả |
|-----|-------|
| `/invitation/accepted` | Trang xác nhận đã accept (giao diện xanh) |
| `/invitation/declined` | Trang xác nhận đã decline (giao diện đỏ) |
| `/invitation/error` | Trang báo lỗi (token hết hạn, đã sử dụng, v.v.) |

---

## Cách Test Từng Tính Năng

### A. Test luồng gửi invitation email

**Yêu cầu**: Backend đang chạy, tài khoản Gmail đã cấu hình App Password trong `application.properties`.

```
Bước 1: Đăng nhập với tài khoản Chair
Bước 2: Vào trang Conference Update → Assign role cho 1 user (VD: assign REVIEWER)
         → Hệ thống tự tạo ConferenceUserTrack + UUID token
Bước 3: Truy cập /conference/{conferenceId}/email
Bước 4: Tab "Invitations" → Thấy user vừa assign với status "Pending"
Bước 5: Click "Resend" → Hệ thống:
         - Tạo token mới
         - Gửi email HTML đến user với link Accept/Decline
         - Toast "Invitation resent"
Bước 6: Kiểm tra email nhận được → Click "Accept Invitation"
         → Redirect đến /invitation/accepted
         → DB: isAccepted = true
         → Chair nhận notification
```

### B. Test luồng accept/decline qua email

```
Bước 1: Sau khi gửi invitation email (bước A)
Bước 2: Mở email nhận được
Bước 3: Click "✓ Accept Invitation" 
         → Browser redirect đến: localhost:3000/invitation/accepted?token=xxx
         → Trang hiển thị xác nhận thành công (giao diện xanh)
Bước 4: Test lại click Accept lần 2 
         → Redirect đến: /invitation/error?message=This invitation has already been accepted
Bước 5: Test token hết hạn: sửa tokenExpiresAt trong DB về quá khứ, click lại link
         → Redirect đến: /invitation/error?message=Invitation token has expired...
```

### C. Test Bulk Email

```
Bước 1: Truy cập /conference/{conferenceId}/email → Tab "Bulk Email"
Bước 2: Chọn "All Reviewers" 
Bước 3: Nhập subject: "Important Update - {Conference.Name}"
Bước 4: Nhập body (click placeholder chip để thêm):
         "Dear {Recipient.Name},
         
         We have an important update for {Conference.Name}...
         
         Best regards"
Bước 5: Click "Send to all reviewers"
         → Toast "Bulk email sent"
         → Tab "History" hiển thị email đã gửi
Bước 6: Kiểm tra email reviewer nhận được:
         - {Conference.Name} → thay bằng tên conference thực
         - {Recipient.Name} → thay bằng tên reviewer thực
```

### D. Test xem Email History

```
Bước 1: Truy cập /conference/{conferenceId}/email → Tab "History"
Bước 2: Kiểm tra danh sách email đã gửi
         → Mỗi dòng hiển thị: To, Subject, Type (INVITATION/BULK/...), Status (Sent/Error), Sent At
Bước 3: Click "Refresh" để cập nhật danh sách
```

---

## Cách truy cập trang Email Management

Có 2 cách:

1. **URL trực tiếp**: `http://localhost:3000/conference/{conferenceId}/email`
2. **Thêm link vào conference update page** (tùy chọn): Bạn có thể thêm 1 button "Email Management" vào trang `/conference/[conferenceId]/update` để navigate đến trang email.

---

## Lưu ý cấu hình

### Backend (`application.properties`)
```properties
# Cấu hình mail server (Gmail)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password     # App Password từ Google Account

# URL
app.base-url=http://localhost:8080         # Backend URL (để tạo link Accept/Decline)
app.frontend-url=http://localhost:3000     # Frontend URL (để redirect sau accept/decline)
```

### Frontend
```
NEXT_PUBLIC_API_URL=/api/v1               # Proxy qua Next.js hoặc trực tiếp đến backend
```

### Chạy test backend
```powershell
cd "d:\Coding\ĐỒ ÁN\confhub-backend"
.\mvnw.cmd test -Dtest="EmailControllerTest,EmailServiceImplTest"
```

---

## Danh sách API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/v1/email` | Gửi email đơn giản |
| POST | `/api/v1/email/invite` | Gửi invitation email với token |
| POST | `/api/v1/email/bulk` | Gửi email hàng loạt |
| GET | `/api/v1/email/accept/{token}` | Accept invitation (redirect) |
| GET | `/api/v1/email/decline/{token}` | Decline invitation (redirect) |
| GET | `/api/v1/email-history/conference/{id}` | Lịch sử email theo conference |
| PUT | `/api/v1/conference-user-tracks/{id}/resend-invitation` | Gửi lại invitation |
