# Exam Client

Ứng dụng desktop client cho hệ thống thi online, xây dựng bằng Vue 3 + TypeScript + Vite + Electron.

Phiên bản hiện tại: 1.0.2

## Tổng quan

App đã hoàn thiện luồng thi chính:

- Đăng nhập
- Danh sách cuộc thi + countdown theo từng cuộc thi
- Chi tiết cuộc thi
- Danh sách bài tập trong cuộc thi
- Chi tiết đề bài
- Nạp bài với Monaco Editor
- Đồng bộ session đang thi theo server

## Chức năng hiện có

### Auth + session

- Đăng nhập bằng token từ API
- Router guard cho route cần auth
- Kiểm tra session đang thi qua API current contest
- Đồng hồ đếm ngược toàn cục khi đang ở trong cuộc thi
- Có nút rời cuộc thi từ dock countdown
- Đăng xuất sẽ clear trạng thái phiên thi local

### Contest flow

- Lấy danh sách contest từ `GET /contests/`
- Lấy chi tiết contest từ `GET /contests/{contest_key}/`
- Tiêu đề contest hiển thị dạng: `name - topic`
- Trang list contest:
  - Contest chưa bắt đầu: hiện `Bắt đầu sau hh:mm:ss`
  - Contest đang diễn ra: hiện `Kết thúc sau hh:mm:ss`
  - Contest đã kết thúc: hiện trạng thái kết thúc
- Contest chưa bắt đầu: ẩn nút vào thi, thay bằng badge khóa + countdown
- Khi countdown của bất kỳ contest chạm mốc (bắt đầu hoặc kết thúc), app tự fetch lại danh sách contest
- Khóa vào contest khác khi user đang tham gia 1 contest

### Problem + submit

- Danh sách bài tập và chi tiết bài tập theo contest
- Theo dõi trạng thái `Đã nộp` / `Chưa nộp`
- Tự động sync trạng thái đã nộp từ server khi vào lại contest
- Submit bằng 2 cách:
  - Upload file
  - Paste/nhập code trực tiếp
- Tự động suy ra ngôn ngữ theo đuôi file upload
- Dropdown ngôn ngữ custom
- Cooldown submit: 10 giây mỗi bài
- Hỗ trợ nạp lại source cũ đã nộp từ server

### Caching + version check

- Cache contest detail/problem detail có TTL
- Dùng API version để quyết định dùng cache hay fetch mới:
  - `GET /contests/{contest_key}/version/`
  - `GET /contests/{contest_key}/problems/{problem_code}/version/`
- Khi contest version thay đổi: clear cache problem liên quan để tránh stale data
- Submission source cache theo fingerprint `submission_id + version_update`

### UI/UX

- App dialog custom (không dùng alert/confirm mặc định)
- Lucide icons (`lucide-vue-next`)
- Font local `@fontsource/be-vietnam-pro` (không phụ thuộc online)
- Monaco load local (không dùng CDN), chạy offline tốt hơn
- Background image toàn app

### Electron

- API call trong renderer đi qua IPC bridge của Electron main process
- Preload bridge expose `window.electronAPI.request(...)`
- Dev mode tự mở DevTools
- Build icon từ `electron/logo.png` sang:
  - `electron/icons/app.icns`
  - `electron/icons/app.ico`

## Routes

- `/` -> Login
- `/exams` -> Danh sách cuộc thi
- `/exam/:key` -> Chi tiết cuộc thi
- `/exam/:key/problems` -> Danh sách bài tập
- `/exam/:key/problems/:problem` -> Chi tiết bài tập
- `/exam/:key/problems/:problem/submit` -> Nạp bài
- `/exam/:key/join` -> Trang join (dự phòng)

## Công nghệ

- Vue 3 + TypeScript
- Vite
- Tailwind CSS v4
- Vue Router
- Monaco Editor (`monaco-editor`, `@guolao/vue-monaco-editor`)
- KaTeX
- Lucide Vue Next
- Electron + electron-builder

## Scripts

```bash
# Cài dependency
npm install

# Web dev
npm run dev

# Electron dev (cần Vite dev server đang chạy)
npm run electron:dev

# Build web app (có prebuild tạo icon)
npm run build

# Tạo icon desktop từ electron/logo.png
npm run generate:icons

# Đóng gói desktop
npm run electron:mac
npm run electron:win
npm run electron:linux
```

## Lưu ý

- Dữ liệu local (token, active session, submitted map, cooldown, cached source) đang lưu localStorage.
- Cache in-memory sẽ reset khi reload app.
- Bản build macOS có thể bỏ qua code-signing nếu máy local không có Developer ID hợp lệ.
