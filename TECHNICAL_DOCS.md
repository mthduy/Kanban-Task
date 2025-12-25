# 🔧 Tài liệu kỹ thuật - Kanban Task Management

## Mục lục

1. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
2. [Database Schema](#-database-schema)
3. [API Reference](#-api-reference)
4. [Socket.IO Events](#-socketio-events)
5. [Frontend Architecture](#-frontend-architecture)
6. [Authentication & Security](#-authentication--security)
7. [File Upload System](#-file-upload-system)
8. [Real-time Features](#-real-time-features)
9. [Performance & Optimization](#-performance--optimization)
10. [Deployment Guide](#-deployment-guide)

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │    Database     │
│   (React SPA)   │◄──►│  (Node.js API)  │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ - React 18      │    │ - Express.js    │    │ - Collections:  │
│ - TypeScript    │    │ - TypeScript    │    │   * users       │
│ - Zustand       │    │ - Socket.IO     │    │   * workspaces  │
│ - Tailwind CSS  │    │ - Mongoose      │    │   * boards      │
│ - DND Kit       │    │ - JWT Auth      │    │   * lists       │
│ - Vite          │    │ - Multer        │    │   * cards       │
└─────────────────┘    └─────────────────┘    │   * sessions    │
                                              │   * invitations │
                                              │   * notifications│
                                              └─────────────────┘
```

### Tech Stack chi tiết

#### Frontend

- **Framework**: React 18.2+ với TypeScript
- **Build Tool**: Vite 5.0+
- **State Management**: Zustand (lightweight state)
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS với custom components
- **UI Library**: Radix UI primitives
- **Real-time**: Socket.IO Client
- **Drag & Drop**: DND Kit
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Internationalization**: react-i18next

#### Backend

- **Runtime**: Node.js 18+ với TypeScript
- **Web Framework**: Express.js 4.18+
- **Database ORM**: Mongoose 8.0+
- **Authentication**: JWT với refresh tokens
- **Real-time**: Socket.IO 4.7+
- **File Upload**: Multer + custom storage
- **Validation**: Joi validation
- **Security**: Helmet, CORS, rate limiting
- **Task Scheduling**: node-cron

#### Database

- **Primary**: MongoDB 7.0+
- **Session Store**: MongoDB (MongoStore)
- **File Storage**: Local filesystem (configurable)

## 🗄️ Database Schema

### Users Collection

```typescript
interface User {
  _id: ObjectId;
  username: string; // Unique username
  email: string; // Unique email
  displayName: string; // Display name
  password: string; // Bcrypt hashed password
  avatarUrl?: string; // Profile picture URL
  createdAt: Date;
  updatedAt: Date;
}
```

### Workspaces Collection

```typescript
interface Workspace {
  _id: ObjectId;
  name: string; // Workspace name
  description?: string; // Optional description
  owner: ObjectId; // Reference to User
  members: Array<{
    userId: ObjectId; // Reference to User
    role: "owner" | "member";
    joinedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Boards Collection

```typescript
interface Board {
  _id: ObjectId;
  title: string; // Board title
  description?: string; // Optional description
  background?: string; // Background color/image URL
  workspace: ObjectId; // Reference to Workspace
  owner: ObjectId; // Reference to User
  members: ObjectId[]; // References to Users
  isReadOnly: boolean; // Read-only mode
  createdAt: Date;
  updatedAt: Date;
}
```

### Lists Collection

```typescript
interface List {
  _id: ObjectId;
  title: string; // List title
  boardId: ObjectId; // Reference to Board
  position: number; // Order position
  createdAt: Date;
  updatedAt: Date;
}
```

### Cards Collection

```typescript
interface Card {
  _id: ObjectId;
  title: string; // Card title
  description?: string; // Card description
  listId: ObjectId; // Reference to List
  boardId: ObjectId; // Reference to Board
  position: number; // Order position in list

  // Optional fields
  labels?: Array<{
    _id?: ObjectId;
    name: string;
    color: string;
  }>;
  members?: ObjectId[]; // Assigned members
  dueDate?: Date; // Due date
  completed: boolean; // Completion status

  // Comments
  comments?: Array<{
    _id: ObjectId;
    text: string;
    author: ObjectId; // Reference to User
    createdAt: Date;
  }>;

  // Attachments
  attachments?: Array<{
    _id: ObjectId;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: ObjectId; // Reference to User
    uploadedAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId; // Reference to User
}
```

### Sessions Collection

```typescript
interface Session {
  _id: string; // Session ID
  expires: Date;
  session: {
    cookie: any;
    passport?: {
      user: string; // User ID
    };
  };
}
```

### Invitations Collection

```typescript
interface Invitation {
  _id: ObjectId;
  email: string; // Invitee email
  workspaceId?: ObjectId; // Reference to Workspace
  boardId?: ObjectId; // Reference to Board
  invitedBy: ObjectId; // Reference to User
  role: "member" | "owner"; // Role to be assigned
  status: "pending" | "accepted" | "declined";
  expiresAt: Date;
  createdAt: Date;
}
```

### Notifications Collection

```typescript
interface Notification {
  _id: ObjectId;
  userId: ObjectId; // Reference to User
  type: "invitation" | "card_assigned" | "card_due" | "comment";
  title: string;
  message: string;
  data?: any; // Additional data
  read: boolean;
  createdAt: Date;
}
```

## 🔌 API Reference

### Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication Endpoints

#### POST /auth/register

Đăng ký người dùng mới

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "avatarUrl": null
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/login

Đăng nhập

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      /* user object */
    },
    "token": "jwt_token_here"
  }
}
```

#### GET /auth/me

Lấy thông tin user hiện tại

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      /* user object */
    }
  }
}
```

### Workspace Endpoints

#### GET /workspaces

Lấy danh sách workspaces của user

**Query Parameters:**

- `limit`: số lượng (mặc định: 10)
- `page`: trang (mặc định: 1)

**Response:**

```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "_id": "...",
        "name": "My Workspace",
        "description": "...",
        "owner": {
          /* user object */
        },
        "members": [
          /* member objects */
        ],
        "role": "owner",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### POST /workspaces

Tạo workspace mới

**Request Body:**

```json
{
  "name": "New Workspace",
  "description": "Workspace description"
}
```

#### PUT /workspaces/:id

Cập nhật workspace

#### DELETE /workspaces/:id

Xóa workspace (chỉ owner)

### Board Endpoints

#### GET /boards/workspace/:workspaceId

Lấy boards của workspace

#### POST /boards

Tạo board mới

**Request Body:**

```json
{
  "title": "New Board",
  "description": "Board description",
  "background": "#3B82F6",
  "workspaceId": "workspace_id"
}
```

#### GET /boards/:id

Lấy chi tiết board

#### PUT /boards/:id

Cập nhật board

#### DELETE /boards/:id

Xóa board

### List Endpoints

#### GET /lists/board/:boardId

Lấy lists của board

#### POST /lists

Tạo list mới

**Request Body:**

```json
{
  "title": "To Do",
  "boardId": "board_id"
}
```

#### PUT /lists/:id

Cập nhật list

#### DELETE /lists/:id

Xóa list

### Card Endpoints

#### GET /cards/board/:boardId

Lấy cards của board với filtering

**Query Parameters:**

- `completed`: true/false
- `members`: comma-separated user IDs
- `labelNames`: comma-separated label names
- `labelColors`: comma-separated colors
- `createdFrom`: ISO date string
- `createdTo`: ISO date string
- `limit`: number

#### POST /cards

Tạo card mới

**Request Body:**

```json
{
  "title": "New Task",
  "description": "Task description",
  "listId": "list_id",
  "boardId": "board_id",
  "position": 1,
  "labels": [{ "name": "Priority", "color": "#ef4444" }],
  "members": ["user_id_1", "user_id_2"],
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

#### PUT /cards/:id

Cập nhật card

#### DELETE /cards/:id

Xóa card

### Invitation Endpoints

#### POST /invitations/send

Gửi lời mời

**Request Body:**

```json
{
  "email": "invitee@example.com",
  "workspaceId": "workspace_id",
  "role": "member"
}
```

#### GET /invitations/received

Lấy lời mời nhận được

#### POST /invitations/:id/accept

Chấp nhận lời mời

#### POST /invitations/:id/decline

Từ chối lời mời

## 🔌 Socket.IO Events

### Connection & Authentication

```typescript
// Client kết nối
socket.connect();

// Server xác thực
socket.on("connect", () => {
  socket.emit("authenticate", { token: "jwt_token" });
});

// Join board room
socket.emit("join-board", { boardId: "board_id" });
```

### Board Events

```typescript
// Board updated
socket.on(
  "board-updated",
  (data: {
    board: Board;
    action: string;
    updatedBy: { id: string; email: string };
  }) => {
    // Handle board update
  }
);

// Board deleted
socket.on(
  "board-deleted",
  (data: { boardId: string; deletedBy: { id: string; email: string } }) => {
    // Handle board deletion
  }
);
```

### List Events

```typescript
// List created
socket.on(
  "list-created",
  (data: { list: List; createdBy: { id: string; email: string } }) => {
    // Handle new list
  }
);

// List updated
socket.on(
  "list-updated",
  (data: {
    list: List;
    action: string;
    updatedBy: { id: string; email: string };
  }) => {
    // Handle list update
  }
);

// List deleted
socket.on(
  "list-deleted",
  (data: { listId: string; deletedBy: { id: string; email: string } }) => {
    // Handle list deletion
  }
);
```

### Card Events

```typescript
// Card created
socket.on(
  "card-created",
  (data: { card: Card; createdBy: { id: string; email: string } }) => {
    // Handle new card
  }
);

// Card updated
socket.on(
  "card-updated",
  (data: {
    card: Card;
    action: string;
    updatedBy: { id: string; email: string };
  }) => {
    // Handle card update
  }
);

// Card moved
socket.on(
  "card-moved",
  (data: {
    cardId: string;
    fromListId: string;
    toListId: string;
    newPosition: number;
    movedBy: { id: string; email: string };
  }) => {
    // Handle card move
  }
);

// Card deleted
socket.on(
  "card-deleted",
  (data: {
    cardId: string;
    listId: string;
    deletedBy: { id: string; email: string };
  }) => {
    // Handle card deletion
  }
);
```

## 🎨 Frontend Architecture

### Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── auth/           # Authentication components
│   ├── board/          # Board-specific components
│   └── notifications/  # Notification components
├── pages/              # Page components
│   ├── Auth/           # Login/Register pages
│   ├── Dashboard/      # Dashboard page
│   ├── Board/          # Board page
│   └── Profile/        # Profile page
├── services/           # API services
├── stores/             # Zustand stores
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── lib/                # Third-party library configs
└── styles/             # Global styles
```

### State Management (Zustand)

#### Auth Store

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}
```

#### Board Store

```typescript
interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: string | null;
  fetchBoards: (workspaceId: string) => Promise<void>;
  createBoard: (boardData: CreateBoardData) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
}
```

### Component Architecture

#### Higher-Order Components

```typescript
// Protected Route HOC
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Error Boundary
export class ErrorBoundary extends React.Component {
  // Error handling implementation
}
```

#### Custom Hooks

```typescript
// Socket hook
export function useSocket(boardId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = socketService.connect();
    setSocket(socketInstance);

    if (boardId && socketInstance) {
      socketService.joinBoard(boardId);
    }

    return () => {
      if (boardId) socketService.leaveBoard(boardId);
      socketService.disconnect();
    };
  }, [boardId]);

  return socket;
}

// Drag and Drop hook
export function useDragAndDrop() {
  // DND Kit implementation
}
```

## 🔐 Authentication & Security

### JWT Implementation

#### Token Structure

```json
{
  "header": {
    "typ": "JWT",
    "alg": "HS256"
  },
  "payload": {
    "id": "user_id",
    "email": "user@example.com",
    "iat": 1640995200,
    "exp": 1641600000
  },
  "signature": "..."
}
```

#### Security Features

- **Password Hashing**: bcrypt với salt rounds = 12
- **JWT Expiration**: 7 ngày
- **Rate Limiting**: 100 requests/15 phút per IP
- **CORS**: Configured cho frontend domain
- **Helmet**: Security headers
- **Input Validation**: Joi schemas
- **XSS Protection**: Input sanitization

### Authentication Flow

```typescript
// 1. User login
const loginResponse = await authService.login(email, password);

// 2. Store token
localStorage.setItem("token", loginResponse.token);

// 3. Set axios default header
axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

// 4. Auto-refresh trước khi expire
useEffect(() => {
  const checkTokenExpiration = () => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpiring = payload.exp * 1000 - Date.now() < 5 * 60 * 1000;

      if (isExpiring) {
        // Refresh token or logout
        authStore.logout();
      }
    }
  };

  const interval = setInterval(checkTokenExpiration, 60000);
  return () => clearInterval(interval);
}, []);
```

## 📎 File Upload System

### Configuration

```typescript
// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/attachments/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  },
});
```

### File Upload Flow

1. **Client**: Chọn file và gọi API upload
2. **Server**: Validate file size và type
3. **Storage**: Lưu file vào thư mục uploads
4. **Database**: Lưu metadata vào card.attachments
5. **Response**: Trả về file info
6. **Real-time**: Broadcast card update via Socket.IO

### File Download

```typescript
// Public download endpoint
app.get("/uploads/attachments/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_PATH, req.params.filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});
```

## ⚡ Real-time Features

### Socket.IO Server Setup

```typescript
// Server setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      socket.userId = user._id.toString();
      socket.userEmail = user.email;
      next();
    } else {
      next(new Error("Authentication failed"));
    }
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

// Connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.userEmail);

  socket.on("join-board", ({ boardId }) => {
    socket.join(`board:${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userEmail);
  });
});
```

### Broadcasting Events

```typescript
// Broadcast to board members
const broadcastToBoardMembers = (boardId: string, event: string, data: any) => {
  io.to(`board:${boardId}`).emit(event, data);
};

// Example: Card created
export const createCard = async (req: Request, res: Response) => {
  const card = await Card.create(cardData);

  // Broadcast to board members
  broadcastToBoardMembers(card.boardId, "card-created", {
    card: await card.populate("members createdBy"),
    createdBy: { id: req.user._id, email: req.user.email },
  });

  res.json({ success: true, data: { card } });
};
```

## ⚡ Performance & Optimization

### Frontend Optimizations

#### Code Splitting

```typescript
// Lazy loading components
const BoardPage = lazy(() => import("../pages/Board/BoardPage"));
const CardModal = lazy(() => import("../pages/Board/CardModal"));

// Route-based splitting
<Route
  path="/board/:id"
  element={
    <Suspense fallback={<BoardSkeleton />}>
      <BoardPage />
    </Suspense>
  }
/>;
```

#### Memoization

```typescript
// Memo for expensive computations
const filteredCards = useMemo(() => {
  return cards.filter((card) => {
    if (
      filters.completed !== undefined &&
      card.completed !== filters.completed
    ) {
      return false;
    }
    // More filter logic...
    return true;
  });
}, [cards, filters]);

// Callback memoization
const handleCardUpdate = useCallback((cardId: string, updates: any) => {
  setCards((prev) =>
    prev.map((card) => (card._id === cardId ? { ...card, ...updates } : card))
  );
}, []);
```

#### Virtual Scrolling (for large lists)

```typescript
// Virtual scrolling implementation for many cards
import { FixedSizeList as List } from "react-window";

const CardList = ({ cards }) => (
  <List height={600} itemCount={cards.length} itemSize={120} itemData={cards}>
    {({ index, style, data }) => (
      <div style={style}>
        <CardComponent card={data[index]} />
      </div>
    )}
  </List>
);
```

### Backend Optimizations

#### Database Indexing

```javascript
// MongoDB indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.boards.createIndex({ workspace: 1 });
db.lists.createIndex({ boardId: 1, position: 1 });
db.cards.createIndex({ listId: 1, position: 1 });
db.cards.createIndex({ boardId: 1, completed: 1 });
db.cards.createIndex({ members: 1 });
db.cards.createIndex({ dueDate: 1 });
```

#### Query Optimization

```typescript
// Efficient population
const board = await Board.findById(boardId)
  .populate({
    path: "members",
    select: "username email displayName avatarUrl",
  })
  .populate({
    path: "owner",
    select: "username email displayName avatarUrl",
  });

// Aggregation for complex queries
const cardStats = await Card.aggregate([
  { $match: { boardId: new mongoose.Types.ObjectId(boardId) } },
  {
    $group: {
      _id: "$listId",
      totalCards: { $sum: 1 },
      completedCards: {
        $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
      },
    },
  },
]);
```

#### Caching Strategy

```typescript
// Redis caching (if implemented)
const getCachedBoards = async (workspaceId: string) => {
  const cacheKey = `workspace:${workspaceId}:boards`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const boards = await Board.find({ workspace: workspaceId });
  await redis.setex(cacheKey, 300, JSON.stringify(boards)); // 5min cache

  return boards;
};
```

## 🚀 Deployment Guide

### Development Environment

```bash
# Clone and setup
git clone <repository>
cd kanban-task-management

# Using Docker Compose
docker-compose up --build -d

# Or manual setup
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

### Production Deployment

#### Docker Production Setup

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/kanban_prod
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7.0
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}

volumes:
  mongodb_data:
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/kanban-app
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /var/www/kanban/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File uploads
    location /uploads/ {
        alias /var/www/kanban/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Environment Variables (Production)

```env
# Backend .env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongo_user:mongo_password@localhost:27017/kanban_prod?authSource=admin
JWT_SECRET=your-super-secure-jwt-secret-for-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-domain.com
UPLOAD_PATH=/var/www/kanban/backend/uploads
MAX_FILE_SIZE=10485760

# Frontend .env
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
VITE_APP_NAME=Kanban Task Management
```

#### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /var/www/kanban-app
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up --build -d
```

### Monitoring & Logging

#### PM2 Process Manager

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kanban-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Health Check Endpoint

```typescript
// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  });
});
```

---

_Tài liệu này được cập nhật thường xuyên. Phiên bản cuối: Tháng 12, 2024_
