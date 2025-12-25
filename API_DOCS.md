# 📡 API Documentation

## Base Information

- **Base URL**: `http://localhost:5000/api` (development)
- **Authentication**: Bearer JWT Token
- **Content-Type**: `application/json`
- **Rate Limit**: 100 requests per 15 minutes

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Auth Endpoints

### POST /auth/register

Register a new user

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "password": "password123"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "675a1234567890abcdef1234",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "avatarUrl": null,
      "createdAt": "2024-12-23T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login

Login user

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "675a1234567890abcdef1234",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "avatarUrl": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/logout

Logout user

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current user info

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "675a1234567890abcdef1234",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "avatarUrl": null
    }
  }
}
```

---

## 👤 User Endpoints

### PUT /users/profile

Update user profile

**Request Body:**

```json
{
  "displayName": "John Smith",
  "username": "johnsmith"
}
```

### POST /users/avatar

Upload user avatar

**Content-Type**: `multipart/form-data`

**Request Body:**

```
avatar: <file>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "/uploads/avatars/1703332200000-123456789.jpg"
  }
}
```

---

## 🏢 Workspace Endpoints

### GET /workspaces

Get user's workspaces

**Query Parameters:**

- `limit` (optional): Number of results (default: 10)
- `page` (optional): Page number (default: 1)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "_id": "675b1234567890abcdef1234",
        "name": "My Team Workspace",
        "description": "Our team's main workspace",
        "owner": {
          "_id": "675a1234567890abcdef1234",
          "displayName": "John Doe",
          "username": "johndoe",
          "avatarUrl": null
        },
        "members": [
          {
            "userId": "675a1234567890abcdef1234",
            "role": "owner",
            "user": {
              "_id": "675a1234567890abcdef1234",
              "displayName": "John Doe",
              "username": "johndoe",
              "avatarUrl": null
            },
            "joinedAt": "2024-12-23T10:30:00.000Z"
          }
        ],
        "role": "owner",
        "createdAt": "2024-12-23T10:30:00.000Z"
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

### POST /workspaces

Create new workspace

**Request Body:**

```json
{
  "name": "New Workspace",
  "description": "Workspace for our new project"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Workspace created successfully",
  "data": {
    "workspace": {
      "_id": "675c1234567890abcdef1234",
      "name": "New Workspace",
      "description": "Workspace for our new project",
      "owner": "675a1234567890abcdef1234",
      "members": [
        {
          "userId": "675a1234567890abcdef1234",
          "role": "owner",
          "joinedAt": "2024-12-23T11:00:00.000Z"
        }
      ],
      "createdAt": "2024-12-23T11:00:00.000Z"
    }
  }
}
```

### PUT /workspaces/:id

Update workspace

**Request Body:**

```json
{
  "name": "Updated Workspace Name",
  "description": "Updated description"
}
```

### DELETE /workspaces/:id

Delete workspace (owner only)

**Response (200):**

```json
{
  "success": true,
  "message": "Workspace deleted successfully"
}
```

---

## 📋 Board Endpoints

### GET /boards/workspace/:workspaceId

Get boards in workspace

**Response (200):**

```json
{
  "success": true,
  "data": {
    "boards": [
      {
        "_id": "675d1234567890abcdef1234",
        "title": "Project Board",
        "description": "Main project tracking board",
        "background": "#3B82F6",
        "workspace": "675b1234567890abcdef1234",
        "owner": {
          "_id": "675a1234567890abcdef1234",
          "displayName": "John Doe",
          "username": "johndoe",
          "avatarUrl": null
        },
        "members": [
          {
            "_id": "675a1234567890abcdef1234",
            "displayName": "John Doe",
            "username": "johndoe",
            "avatarUrl": null
          }
        ],
        "isReadOnly": false,
        "createdAt": "2024-12-23T11:15:00.000Z"
      }
    ]
  }
}
```

### POST /boards

Create new board

**Request Body:**

```json
{
  "title": "New Board",
  "description": "Board description",
  "background": "#10B981",
  "workspaceId": "675b1234567890abcdef1234"
}
```

### GET /boards/:id

Get board details

**Response (200):**

```json
{
  "success": true,
  "data": {
    "board": {
      "_id": "675d1234567890abcdef1234",
      "title": "Project Board",
      "description": "Main project tracking board",
      "background": "#3B82F6",
      "workspace": {
        "_id": "675b1234567890abcdef1234",
        "name": "My Team Workspace"
      },
      "owner": {
        "_id": "675a1234567890abcdef1234",
        "displayName": "John Doe",
        "username": "johndoe",
        "avatarUrl": null
      },
      "members": [
        {
          "_id": "675a1234567890abcdef1234",
          "displayName": "John Doe",
          "username": "johndoe",
          "avatarUrl": null
        }
      ],
      "isReadOnly": false,
      "userRole": "owner",
      "createdAt": "2024-12-23T11:15:00.000Z"
    }
  }
}
```

### PUT /boards/:id

Update board

**Request Body:**

```json
{
  "title": "Updated Board Title",
  "description": "Updated description",
  "background": "#EF4444",
  "isReadOnly": true
}
```

### DELETE /boards/:id

Delete board

**Response (200):**

```json
{
  "success": true,
  "message": "Board deleted successfully"
}
```

### POST /boards/:id/members

Add member to board

**Request Body:**

```json
{
  "userId": "675e1234567890abcdef1234"
}
```

### DELETE /boards/:id/members/:userId

Remove member from board

---

## 📝 List Endpoints

### GET /lists/board/:boardId

Get lists in board

**Response (200):**

```json
{
  "success": true,
  "data": {
    "lists": [
      {
        "_id": "675e1234567890abcdef1234",
        "title": "To Do",
        "boardId": "675d1234567890abcdef1234",
        "position": 1,
        "createdAt": "2024-12-23T11:30:00.000Z"
      },
      {
        "_id": "675f1234567890abcdef1234",
        "title": "In Progress",
        "boardId": "675d1234567890abcdef1234",
        "position": 2,
        "createdAt": "2024-12-23T11:31:00.000Z"
      },
      {
        "_id": "676a1234567890abcdef1234",
        "title": "Done",
        "boardId": "675d1234567890abcdef1234",
        "position": 3,
        "createdAt": "2024-12-23T11:32:00.000Z"
      }
    ]
  }
}
```

### POST /lists

Create new list

**Request Body:**

```json
{
  "title": "New List",
  "boardId": "675d1234567890abcdef1234"
}
```

### PUT /lists/:id

Update list

**Request Body:**

```json
{
  "title": "Updated List Title"
}
```

### DELETE /lists/:id

Delete list

---

## 🎫 Card Endpoints

### GET /cards/board/:boardId

Get cards in board with filtering

**Query Parameters:**

- `completed` (optional): `true` | `false`
- `members` (optional): Comma-separated user IDs
- `labelNames` (optional): Comma-separated label names
- `labelColors` (optional): Comma-separated colors
- `createdFrom` (optional): ISO date string
- `createdTo` (optional): ISO date string
- `limit` (optional): Number of results

**Example:**

```
GET /cards/board/675d1234567890abcdef1234?completed=false&members=675a1234567890abcdef1234&limit=50
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "_id": "676b1234567890abcdef1234",
        "title": "Implement user authentication",
        "description": "Add JWT-based authentication system",
        "listId": "675e1234567890abcdef1234",
        "boardId": "675d1234567890abcdef1234",
        "position": 1,
        "labels": [
          {
            "_id": "676c1234567890abcdef1234",
            "name": "High Priority",
            "color": "#EF4444"
          },
          {
            "_id": "676d1234567890abcdef1234",
            "name": "Backend",
            "color": "#3B82F6"
          }
        ],
        "members": [
          {
            "_id": "675a1234567890abcdef1234",
            "displayName": "John Doe",
            "username": "johndoe",
            "avatarUrl": null
          }
        ],
        "dueDate": "2024-12-30T23:59:59.000Z",
        "completed": false,
        "comments": [
          {
            "_id": "676e1234567890abcdef1234",
            "text": "Started working on this task",
            "author": {
              "_id": "675a1234567890abcdef1234",
              "displayName": "John Doe",
              "username": "johndoe"
            },
            "createdAt": "2024-12-23T12:00:00.000Z"
          }
        ],
        "attachments": [
          {
            "_id": "676f1234567890abcdef1234",
            "filename": "1703332800000-987654321.pdf",
            "originalName": "requirements.pdf",
            "mimeType": "application/pdf",
            "size": 1048576,
            "uploadedBy": {
              "_id": "675a1234567890abcdef1234",
              "displayName": "John Doe",
              "username": "johndoe"
            },
            "uploadedAt": "2024-12-23T12:00:00.000Z"
          }
        ],
        "createdAt": "2024-12-23T11:45:00.000Z",
        "createdBy": {
          "_id": "675a1234567890abcdef1234",
          "displayName": "John Doe",
          "username": "johndoe"
        }
      }
    ]
  }
}
```

### POST /cards

Create new card

**Request Body:**

```json
{
  "title": "New Task",
  "description": "Task description",
  "listId": "675e1234567890abcdef1234",
  "boardId": "675d1234567890abcdef1234",
  "position": 1,
  "labels": [
    {
      "name": "Bug",
      "color": "#EF4444"
    }
  ],
  "members": ["675a1234567890abcdef1234"],
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

### PUT /cards/:id

Update card

**Request Body:**

```json
{
  "title": "Updated Task Title",
  "description": "Updated description",
  "completed": true,
  "dueDate": "2024-12-25T23:59:59.000Z"
}
```

### DELETE /cards/:id

Delete card

### POST /cards/:id/move

Move card to different list/position

**Request Body:**

```json
{
  "listId": "675f1234567890abcdef1234",
  "position": 2
}
```

### POST /cards/:id/comments

Add comment to card

**Request Body:**

```json
{
  "text": "This is a comment on the card"
}
```

### PUT /cards/:cardId/comments/:commentId

Update comment

### DELETE /cards/:cardId/comments/:commentId

Delete comment

---

## 📎 Card Attachment Endpoints

### POST /cards/:id/attachments

Upload attachment to card

**Content-Type**: `multipart/form-data`

**Request Body:**

```
attachment: <file>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "attachment": {
      "_id": "676f1234567890abcdef1234",
      "filename": "1703333400000-123456789.jpg",
      "originalName": "screenshot.jpg",
      "mimeType": "image/jpeg",
      "size": 2097152,
      "uploadedBy": "675a1234567890abcdef1234",
      "uploadedAt": "2024-12-23T12:10:00.000Z"
    }
  }
}
```

### GET /uploads/attachments/:filename

Download attachment (public endpoint)

### DELETE /cards/:cardId/attachments/:attachmentId

Delete attachment

---

## 📨 Invitation Endpoints

### POST /invitations/send

Send invitation

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "workspaceId": "675b1234567890abcdef1234",
  "role": "member"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitation": {
      "_id": "677a1234567890abcdef1234",
      "email": "newuser@example.com",
      "workspaceId": "675b1234567890abcdef1234",
      "invitedBy": "675a1234567890abcdef1234",
      "role": "member",
      "status": "pending",
      "expiresAt": "2024-12-30T12:15:00.000Z",
      "createdAt": "2024-12-23T12:15:00.000Z"
    }
  }
}
```

### GET /invitations/received

Get received invitations

**Response (200):**

```json
{
  "success": true,
  "data": {
    "invitations": [
      {
        "_id": "677a1234567890abcdef1234",
        "email": "john@example.com",
        "workspace": {
          "_id": "675b1234567890abcdef1234",
          "name": "Design Team Workspace",
          "description": "For all design projects"
        },
        "invitedBy": {
          "_id": "675a1234567890abcdef1234",
          "displayName": "Jane Smith",
          "username": "janesmith"
        },
        "role": "member",
        "status": "pending",
        "expiresAt": "2024-12-30T12:15:00.000Z",
        "createdAt": "2024-12-23T12:15:00.000Z"
      }
    ]
  }
}
```

### POST /invitations/:id/accept

Accept invitation

**Response (200):**

```json
{
  "success": true,
  "message": "Invitation accepted successfully"
}
```

### POST /invitations/:id/decline

Decline invitation

---

## 🔔 Notification Endpoints

### GET /notifications

Get user notifications

**Query Parameters:**

- `read` (optional): `true` | `false`
- `limit` (optional): Number of results (default: 20)
- `page` (optional): Page number (default: 1)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "677b1234567890abcdef1234",
        "userId": "675a1234567890abcdef1234",
        "type": "card_assigned",
        "title": "New task assigned",
        "message": "You have been assigned to 'Implement user authentication'",
        "data": {
          "cardId": "676b1234567890abcdef1234",
          "boardId": "675d1234567890abcdef1234"
        },
        "read": false,
        "createdAt": "2024-12-23T12:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    },
    "unreadCount": 3
  }
}
```

### PUT /notifications/:id/read

Mark notification as read

### PUT /notifications/mark-all-read

Mark all notifications as read

---

## 📊 Analytics Endpoints

### GET /boards/:id/stats

Get board statistics

**Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalCards": 25,
      "completedCards": 12,
      "completionRate": 48,
      "totalLists": 4,
      "totalMembers": 3,
      "cardsByList": {
        "675e1234567890abcdef1234": { "total": 8, "completed": 2 },
        "675f1234567890abcdef1234": { "total": 10, "completed": 5 },
        "676a1234567890abcdef1234": { "total": 7, "completed": 5 }
      },
      "overdueCards": 3,
      "dueSoonCards": 2
    }
  }
}
```

---

## Error Responses

### Error Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

### Common Error Codes

| Status | Error                 | Description               |
| ------ | --------------------- | ------------------------- |
| 400    | Bad Request           | Invalid request data      |
| 401    | Unauthorized          | Missing or invalid token  |
| 403    | Forbidden             | Insufficient permissions  |
| 404    | Not Found             | Resource not found        |
| 422    | Validation Error      | Request validation failed |
| 429    | Too Many Requests     | Rate limit exceeded       |
| 500    | Internal Server Error | Server error              |

### Validation Error Example

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Valid email is required",
    "password": "Password must be at least 6 characters"
  }
}
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Too many requests",
  "details": "Rate limit exceeded. Try again later."
}
```

---

_API Documentation v1.0 - Last updated: December 2024_
