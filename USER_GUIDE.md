# Kanban Task Management

A collaborative task management app inspired by Trello.

kanban task management demo

Check out the live website

## Features

It has most of the features available on Trello, like creating and editing cards, dragging around cards, managing workspaces and teams.
Real-time collaboration with team members.
Responsive design that works great on desktop, tablet and mobile devices.
Dark mode support.
Multi-language support (Vietnamese and English).

## Tech Stack

**Frontend:**

- React 19
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- React Router
- Socket.io Client
- React Hook Form
- Zod (Validation)
- React DnD Kit (Drag & Drop)

**Backend:**

- Node.js
- Express.js
- TypeScript
- Socket.io
- MongoDB
- Mongoose
- JWT Authentication
- Bcrypt
- Multer (File Upload)

**DevOps:**

- Docker
- Docker Compose
- Nginx
- ESLint
- Prettier

## Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Docker (optional)

### Quick Start with Docker

```bash
git clone https://github.com/mthduy/kanban-task-management.git
cd kanban-task-management
docker-compose up --build -d
```

The application will be available at:

- Frontend: http://localhost
- Backend API: http://localhost:5001

### Manual Installation

#### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend directory:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/kanban_task_management
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:5174
```

Start MongoDB and run backend:

```bash
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5174

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── configs/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Auth & validation
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   ├── validations/
│   │   └── server.ts       # App entry point
│   │   └── socket.ts       # App entry point
│   ├── uploads/            # File attachments
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API calls
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities
│   └── Dockerfile
├── docker-compose.yml      # Multi-container setup
└── README.md
```

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

## API Documentation

The backend provides RESTful APIs for:

- **Authentication**: `/api/auth/*`
- **Workspaces**: `/api/workspaces/*`
- **Boards**: `/api/boards/*`
- **Lists**: `/api/lists/*`
- **Cards**: `/api/cards/*`
- **Users**: `/api/users/*`
- **Notifications**: `/api/notifications/*`

Socket.io events for real-time updates on board changes.

## User Guide

## Table of Contents

1. [Authentication](#authentication)
2. [Workspace Management](#workspace-management)
3. [Working with Boards](#working-with-boards)
4. [Managing Lists and Cards](#managing-lists-and-cards)
5. [Team Collaboration](#team-collaboration)
6. [Advanced Features](#advanced-features)
7. [Tips and Tricks](#tips-and-tricks)

## Authentication

### Creating a New Account

1. Access the application homepage
2. Click "Sign Up"
3. Fill in the information:
   - Display name
   - Email address
   - Password (minimum 6 characters)
4. Click "Create Account"

### Signing In

1. Click "Sign In"
2. Enter your email and password
3. Click "Sign In"

Note: The system will automatically keep you signed in for 7 days unless you sign out manually.

## Workspace Management

### Creating a New Workspace

1. From Dashboard, click "Create Workspace"
2. Enter workspace name and description
3. Click "Create"

### Inviting Members

1. Go to the workspace you want to invite members to
2. Click "Invite Members"
3. Enter the email of the person you want to invite
4. Click "Send Invitation"

### Managing Members

- **View list**: From workspace, click "Members"
- **Remove member**: Click "Remove" next to member name

## Working with Boards

### Creating a New Board

1. From workspace, click "Create Board"
2. Enter information:
   - Board name
   - Description (optional)
3. Click "Create Board"

### Customizing Board

- **Rename**: Click on board title → Edit
- **Change background**: Click "Background" → Select color or image
- **Read-only mode**: Toggle on/off to control edit permissions

### Adding Members to Board

1. Click "Members"
2. Type email member want to invite
3. Click "Add"

## Managing Lists and Cards

### Creating Lists

1. In board, click "Add a list"
2. Enter list name (e.g., "To Do", "In Progress", "Done")
3. Press Enter or click "Add"

### Creating Cards

1. In list, click "Add a card"
2. Enter card name
3. Press Enter for quick creation, or click "Add card" for detailed input

### Editing Cards in Detail

Click on card to open edit modal:

#### Basic Information

- **Name**: Click on title to edit
- **Description**: Click "Add description" to add details

#### Labels

1. Click "Labels"
2. Select color and enter label name
3. Click "Create" or select existing label

#### Members

1. Click "Members"
2. Select from board member list
3. Selected members will show avatar on card

#### Due Date

1. Click "Due Date"
2. Select date and time
3. Click "Save"
4. Card will show warning color when deadline is near

#### Attachments

1. Click "Attachment"
2. Select file from computer (max 10MB)
3. File will display in attachments section

#### Comments

1. Scroll to "Activity" section
2. Enter comment in text box
3. Click "Comment"

### Moving Cards

- **Drag and drop**: Drag card from one list to another
- **Change position**: Drag card up/down within same list

### Filtering Cards

1. Click "Filter"
2. Select filter criteria:
   - **Status**: Complete/Incomplete
   - **Members**: Cards assigned to specific member
   - **Labels**: Cards with specific labels
   - **Date created**: Cards created within time range
3. Click "Apply"

## Team Collaboration

### Real-time Collaboration

See immediately when other team members:

- Create/edit/delete cards
- Move cards around
- Add comments
- Update board settings

### Notification System

1. Click the notification icon in top right corner
2. View notification list:
   - Workspace/board invitations
   - Activity on cards you're involved in
   - Deadline reminders

### Read-only Mode

- **Enabled**: Members can only view, not edit
- **Disabled**: Members can edit normally

## Advanced Features

### Dark Mode

1. System automatically follows browser theme
2. Or customize in Settings → Interface

### Multi-language Support

- Click the language icon in top right to switch between:
  - Vietnamese
  - English

### Responsive Design

- **Desktop**: Full feature experience
- **Tablet**: Optimized for touch screens
- **Mobile**: Compact interface, easy to use

### Reminder System

- Automatically sends notifications for cards approaching deadline
- Checks daily at 9:00 AM

### Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Save card being edited
- **Esc**: Close modal/dialog
- **Tab**: Navigate between input fields

## Tips and Tricks

### Effective Organization

1. **Use clear list names**:

   - "Backlog" → "To Do"
   - "In Progress" → "In Development"
   - "Review" → "Under Review"
   - "Done" → "Completed"

2. **Use color labels**:

   - Red: High priority
   - Yellow: Medium priority
   - Green: Low priority
   - Blue: Bug/Fix

3. **Set reasonable deadlines**:
   - Always set deadlines for important tasks
   - Leave buffer time for complex tasks

### Suggested Workflows

#### For Software Development Teams

1. **Backlog**: All features to be done
2. **Sprint Planning**: Features for current sprint
3. **In Development**: Currently coding
4. **Testing**: Under testing
5. **Done**: Complete and deployed

#### For Marketing Teams

1. **Ideas**: Campaign ideas
2. **Planning**: Detailed planning
3. **In Progress**: Currently executing
4. **Review**: Content approval
5. **Published**: Released

## Support

If you encounter issues or need support:

- Email: maithihongduy@gmail.com
- Create issues on GitHub
- Submit pull requests for improvements

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

Last updated: December, 2025
