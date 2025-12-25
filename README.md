# 📋 Kanban Task Management

Một ứng dụng quản lý công việc theo phương pháp Kanban được xây dựng với React, Node.js và MongoDB. Ứng dụng cho phép tạo workspace, boards, lists và cards với khả năng cộng tác thời gian thực.

![Kanban Board Interface](https://via.placeholder.com/800x400?text=Kanban+Task+Management+Interface)

## ✨ Tính năng

### 🏢 Quản lý Workspace

- Tạo và quản lý nhiều workspace
- Mời thành viên tham gia workspace
- Phân quyền thành viên (Owner, Member)

### 📋 Quản lý Boards

- Tạo nhiều board trong mỗi workspace
- Thiết lập background cho board
- Chế độ chỉ xem (Read-only mode)
- Quản lý thành viên board

### 📝 Quản lý Lists & Cards

- Tạo lists để tổ chức công việc
- Tạo cards với thông tin chi tiết
- Kéo thả cards giữa các lists
- Thêm mô tả, nhãn, thành viên cho cards
- Thiết lập ngày hết hạn
- Đính kèm file vào cards
- Bình luận trên cards

### 🚀 Tính năng nâng cao

- **Cộng tác thời gian thực**: Xem thay đổi ngay lập tức từ các thành viên khác
- **Thông báo**: Nhận thông báo khi có hoạt động mới
- **Bộ lọc**: Lọc cards theo trạng thái, thành viên, nhãn, ngày tạo
- **Responsive Design**: Tương thích với mobile và tablet
- **Dark Mode**: Hỗ trợ chế độ tối
- **Đa ngôn ngữ**: Tiếng Việt và Tiếng Anh
- **Nhắc nhở**: Hệ thống nhắc nhở cho các task sắp hết hạn

## 🛠️ Công nghệ sử dụng

### Frontend

- **React 18** với TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router DOM** - Routing
- **Socket.IO Client** - Real-time communication
- **DND Kit** - Drag and drop
- **React Hook Form** - Form handling
- **React i18next** - Internationalization

### Backend

- **Node.js** với TypeScript
- **Express.js** - Web framework
- **MongoDB** với Mongoose - Database
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Multer** - File upload
- **Node-cron** - Task scheduling

### DevOps

- **Docker & Docker Compose** - Containerization
- **MongoDB** - Database
- **Nginx** - Reverse proxy (production)

## 📦 Cài đặt và Chạy

### Yêu cầu hệ thống

- Node.js 18+
- Docker và Docker Compose
- MongoDB (hoặc sử dụng Docker)

### 1. Clone repository

```bash
git clone https://github.com/your-username/kanban-task-management.git
cd kanban-task-management
```

### 2. Chạy với Docker Compose (Khuyến nghị)

```bash
# Chạy toàn bộ ứng dụng với Docker
docker-compose up --build -d

# Kiểm tra logs
docker-compose logs -f
```

Ứng dụng sẽ chạy tại:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- MongoDB: localhost:27017

### 3. Hoặc chạy từng service riêng biệt

#### Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env (copy từ .env.example)
cp .env.example .env

# Sửa thông tin database trong .env
# MONGODB_URI=mongodb://localhost:27017/kanban_task_management
# JWT_SECRET=your-jwt-secret
# PORT=5000

# Chạy development server
npm run dev
```

#### Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env (copy từ .env.example)
cp .env.example .env

# Sửa API URL trong .env
# VITE_API_URL=http://localhost:5000/api

# Chạy development server
npm run dev
```

## 🔧 Cấu hình

### Backend Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/kanban_task_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Socket.IO
VITE_SOCKET_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=Kanban Task Management
VITE_MAX_FILE_SIZE=10485760
```

## 🚀 Triển khai (Production)

### Sử dụng Docker Compose

```bash
# Tạo file docker-compose.prod.yml cho production
# Cập nhật environment variables cho production

# Chạy production build
docker-compose -f docker-compose.prod.yml up --build -d
```

### Manual Deployment

#### Backend

```bash
cd backend
npm run build
npm start
```

#### Frontend

```bash
cd frontend
npm run build
# Serve thư mục dist với web server (nginx, apache, etc.)
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Workspaces

- `GET /api/workspaces` - Lấy danh sách workspace
- `POST /api/workspaces` - Tạo workspace mới
- `PUT /api/workspaces/:id` - Cập nhật workspace
- `DELETE /api/workspaces/:id` - Xóa workspace

### Boards

- `GET /api/boards/workspace/:workspaceId` - Lấy boards của workspace
- `POST /api/boards` - Tạo board mới
- `GET /api/boards/:id` - Lấy chi tiết board
- `PUT /api/boards/:id` - Cập nhật board
- `DELETE /api/boards/:id` - Xóa board

### Lists & Cards

- `GET /api/lists/board/:boardId` - Lấy lists của board
- `POST /api/lists` - Tạo list mới
- `PUT /api/lists/:id` - Cập nhật list
- `DELETE /api/lists/:id` - Xóa list

## 🔄 Socket Events

### Board Events

- `join-board` - Tham gia board room
- `board-updated` - Board được cập nhật
- `board-deleted` - Board bị xóa

### List Events

- `list-created` - List mới được tạo
- `list-updated` - List được cập nhật
- `list-deleted` - List bị xóa

### Card Events

- `card-created` - Card mới được tạo
- `card-updated` - Card được cập nhật
- `card-deleted` - Card bị xóa
- `card-moved` - Card được di chuyển

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📋 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics và reporting
- [ ] Integration với các công cụ bên ngoài (Slack, Teams)
- [ ] Advanced workflow automation
- [ ] Time tracking
- [ ] Gantt chart view
- [ ] Calendar view

## ❗ Troubleshooting

### Lỗi thường gặp

**1. Không kết nối được database**

```bash
# Kiểm tra MongoDB đang chạy
docker ps | grep mongo

# Restart MongoDB container
docker-compose restart mongodb
```

**2. Frontend không load được**

```bash
# Clear cache và reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**3. Socket connection failed**

```bash
# Kiểm tra backend đang chạy
curl http://localhost:5000/api/health

# Kiểm tra CORS settings
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- **Your Name** - _Initial work_ - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- React team for the amazing framework
- Socket.IO team for real-time capabilities
- Tailwind CSS for the beautiful styling system
- MongoDB team for the excellent database

---

Made with ❤️ by [Your Name]
