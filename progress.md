# 📌 4FUNBET - Progress Tracking

## ✅ A. ĐÃ HOÀN THÀNH
### 1. Hoàn thiện hệ thống hiện tại
- [x] Wallet UI với Deposit/Withdraw cơ bản.
- [x] Game history.
- [x] Game API (coinflip, dice...).
- [x] Transaction API.
- [x] Daily/Hourly/Weekly bonus.
- [x] Tách Profile/Settings:
  - app/settings/page.js cho đổi email/username/password.
  - profile/page.js chỉ hiển thị thông tin user.
- [x] Wallet transaction history:
  - Tab "Transaction History" vào Wallet UI.
  - API /transactions lấy deposit/withdraw.
- [x] Refactor Navbar:
  - Navbar theo logic mới (hamburger khi login).
  - Wallet 2 tầng (balance + bank) click được.

### 2. Notification System nâng cao
- [x] models/Notification.js (userId, type, message, read, createdAt).
- [x] notificationRoutes.js (fetch, mark as read).
- [x] socket.io backend push realtime.
- [x] Frontend: hooks/useSocket.js, NotificationBell + dropdown.

### 3. PvP Service (sườn cơ bản)
- [x] Backend:
  - models/PvpRoom.js (roomId, players[], bets[], status).
  - pvpRoutes.js (create/join, ready/start cơ bản).
  - socket.io handler cho PvP events.
- [x] Frontend:
  - PvP UI cơ bản (room list, join/create).
  - Realtime update qua socket.
- [x] Logic mới:
  - Start chỉ yêu cầu participant ready, owner không cần.
  - Invite gửi realtime qua socket (chưa lưu DB).
- [x] Nâng cấp bổ sung:
  - `roomId` rút gọn 5 ký tự (a-z, A-Z, 0-9) + kiểm tra unique khi tạo.
  - Slot hiển thị username + avatar nhỏ (thay vì _id).
  - Xóa phần "Joined at" trong slot.
  - Notification invite hiển thị username đúng, không lặp.

---

## ⏳ B. CHƯA HOÀN THÀNH
### 1. PvP Service (nâng cao)
- [ ] Backend: Lưu PvP invite vào Notification DB + kèm link join room.
- [ ] Frontend:
  - NotificationBell click vào invite → join phòng ngay.
  - UI Invite chọn user từ danh sách bạn bè thay vì prompt.

### 2. Leaderboard
- [ ] Backend:
  - models/Leaderboard.js hoặc tổng hợp từ game_logs.
  - leaderboardRoutes.js (top winners theo tuần/tháng).
- [ ] Frontend: Page leaderboard hiển thị bảng xếp hạng.

### 3. Lottery System
- [ ] Backend:
  - models/Lottery.js (tickets[], drawDate, winners).
  - lotteryRoutes.js (buy ticket, draw result).
  - cron/lottery.js auto draw 2 lần/tuần.
- [ ] Frontend: UI lottery (mua vé, xem kết quả gần nhất).

### 4. Game Lobby nâng cấp
- [ ] Thêm UI dạng card (icon, tỉ lệ thắng, min bet).
- [ ] Filter (PvP / Single Player).
- [ ] PvP button trỏ tới PvP Lobby.

### 5. Database bổ sung
- [x] PvpRoom.js (đã có).
- [ ] Leaderboard.js.
- [ ] Lottery.js.

### 6. Cleanup & Optimization
- [ ] Tối ưu API (pagination cho history/transaction).
- [ ] Tối ưu UI (loading state, error handling).
- [ ] Bảo mật: thêm JWT refresh + rate limit trước khi mở public.
- [ ] Dọn code, log, cấu hình env.
