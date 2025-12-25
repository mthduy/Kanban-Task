# Kanban Task Management

A collaborative task management application built with React, Node.js, and MongoDB. The application enables creating workspaces, boards, lists, and cards with real-time collaboration capabilities.

## Features

### Workspace Management

- Create and manage multiple workspaces
- Invite members to join workspaces
- Member role management (Owner, Member)

### Board Management

- Create multiple boards within each workspace
- Set custom board backgrounds
- Read-only mode support
- Board member management

### Lists & Cards Management

- Create lists to organize tasks
- Create detailed cards with rich information
- Drag and drop cards between lists
- Add descriptions, labels, and members to cards
- Set due dates for cards
- Attach files to cards
- Comment system on cards

### Advanced Features

- **Real-time Collaboration**: See changes instantly from other members
- **Notifications**: Receive notifications for new activities
- **Filtering**: Filter cards by status, members, labels, creation date
- **Responsive Design**: Compatible with mobile and tablet devices
- **Dark Mode**: Support for dark theme
- **Multi-language**: Vietnamese and English support
- **Reminders**: Reminder system for tasks approaching deadline

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling framework
- **Zustand** - State management
- **React Router DOM** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **DND Kit** - Drag and drop functionality
- **React Hook Form** - Form handling
- **React i18next** - Internationalization

### Backend

- **Node.js** with TypeScript
- **Express.js** - Web framework
- **MongoDB** with Mongoose - Database
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Multer** - File upload handling
- **Node-cron** - Task scheduling

### DevOps

- **Docker & Docker Compose** - Containerization
- **MongoDB** - Database
- **Nginx** - Reverse proxy

## Installation and Setup

### System Requirements

- Node.js 18+
- Docker and Docker Compose
- MongoDB (or use Docker)

### 1. Clone Repository

```bash
git clone https://github.com/mthduy/kanban-task.git
cd kanban-task-management
```

### 2. Run with Docker Compose (Recommended)

```bash
# Run the entire application with Docker
docker-compose up --build -d

# Check logs
docker-compose logs -f
```

Application will be available at:

- Frontend: http://localhost
- Backend: http://localhost:5001

### 3. Manual Installation

#### Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install

# Create environment file
cp .env.example .env
# Edit .env with API URL

npm run dev
```

## Configuration

### Backend Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/kanban_task_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server
PORT=5001
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:5174
```

### Frontend Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:5001/api

# Socket.IO
VITE_SOCKET_URL=http://localhost:5001

# App Configuration
VITE_APP_NAME=Kanban Task Management
VITE_MAX_FILE_SIZE=10485760
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   ├── middlewares/     # Authentication & validation
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── server.ts        # Application entry point
│   ├── uploads/             # File attachments
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── stores/          # Zustand stores
│   │   ├── services/        # API calls
│   │   ├── types/           # TypeScript types
│   │   └── lib/             # Utilities
│   └── Dockerfile
├── docker-compose.yml       # Multi-container setup
└── README.md
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Workspaces

- `GET /api/workspaces` - Get workspace list
- `POST /api/workspaces` - Create new workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Boards

- `GET /api/boards/workspace/:workspaceId` - Get workspace boards
- `POST /api/boards` - Create new board
- `GET /api/boards/:id` - Get board details
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Lists & Cards

- `GET /api/lists/board/:boardId` - Get board lists
- `POST /api/lists` - Create new list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list

## Socket Events

### Board Events

- `join-board` - Join board room
- `board-updated` - Board updated
- `board-deleted` - Board deleted

### List Events

- `list-created` - New list created
- `list-updated` - List updated
- `list-deleted` - List deleted

### Card Events

- `card-created` - New card created
- `card-updated` - Card updated
- `card-deleted` - Card deleted
- `card-moved` - Card moved

## Development

### Backend Development

```bash
cd backend
npm run dev        # Start with nodemon
npm run build      # Build TypeScript
npm run start      # Production start
```

### Frontend Development

```bash
cd frontend
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Code Quality

```bash
# Frontend
npm run lint       # ESLint check
npm run format     # Prettier format

# Backend
npm run lint       # ESLint check
npm run format     # Prettier format
```

## Testing

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

## Support

If you encounter issues or need support:

- Email: maithihongduy@gmail.com
- Create issues on GitHub
- Submit pull requests for improvements

---

Made with ❤️ by Mai Thi Hong Duy
