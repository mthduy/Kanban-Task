import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export function initializeSocketIO(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/, '');
      
      const decoded = jwt.verify(cleanToken, process.env.ACCESS_TOKEN_SECRET || 'your-secret-key') as any;
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', (err as Error).message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    // Join board room for real-time updates
    socket.on('join-board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      
      // Notify other users in the board
      socket.to(`board:${boardId}`).emit('user-joined-board', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        socketId: socket.id
      });
    });

    // Leave board room
    socket.on('leave-board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      
      // Notify other users in the board
      socket.to(`board:${boardId}`).emit('user-left-board', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        socketId: socket.id
      });
    });

    // Board events
    socket.on('board-updated', ({ boardId, board, action }) => {
      socket.to(`board:${boardId}`).emit('board-updated', { 
        board, 
        action, 
        updatedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('board-deleted', ({ boardId }) => {
      socket.to(`board:${boardId}`).emit('board-deleted', { 
        boardId,
        deletedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    // List events
    socket.on('list-created', ({ boardId, list }) => {
      socket.to(`board:${boardId}`).emit('list-created', { 
        list,
        createdBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('list-updated', ({ boardId, list, action }) => {
      socket.to(`board:${boardId}`).emit('list-updated', { 
        list, 
        action,
        updatedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('list-deleted', ({ boardId, listId }) => {
      socket.to(`board:${boardId}`).emit('list-deleted', { 
        listId,
        deletedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('lists-reordered', ({ boardId, lists }) => {
      socket.to(`board:${boardId}`).emit('lists-reordered', { 
        lists,
        reorderedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    // Card events
    socket.on('card-created', ({ boardId, card }) => {
      socket.to(`board:${boardId}`).emit('card-created', { 
        card,
        createdBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('card-updated', ({ boardId, card, action }) => {
      socket.to(`board:${boardId}`).emit('card-updated', { 
        card, 
        action,
        updatedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('card-deleted', ({ boardId, cardId, listId }) => {
      socket.to(`board:${boardId}`).emit('card-deleted', { 
        cardId,
        listId,
        deletedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('card-moved', ({ boardId, cardId, fromListId, toListId, newPosition }) => {
      socket.to(`board:${boardId}`).emit('card-moved', { 
        cardId,
        fromListId,
        toListId,
        newPosition,
        movedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    socket.on('cards-reordered', ({ boardId, listId, cards }) => {
      socket.to(`board:${boardId}`).emit('cards-reordered', { 
        listId,
        cards,
        reorderedBy: { 
          id: socket.userId, 
          email: socket.userEmail 
        } 
      });
    });

    // Typing indicators
    socket.on('user-typing', ({ boardId, cardId, isTyping }) => {
      socket.to(`board:${boardId}`).emit('user-typing', {
        cardId,
        isTyping,
        user: {
          id: socket.userId,
          email: socket.userEmail
        }
      });
    });

    // User presence
    socket.on('cursor-moved', ({ boardId, position }) => {
      socket.to(`board:${boardId}`).emit('cursor-moved', {
        position,
        user: {
          id: socket.userId,
          email: socket.userEmail,
          socketId: socket.id
        }
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Notify all boards this user was in
      socket.rooms.forEach(room => {
        if (room.startsWith('board:')) {
          socket.to(room).emit('user-left-board', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            socketId: socket.id
          });
        }
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}

// Export socket instance for use in controllers
export let socketInstance: SocketIOServer | null = null;

export function setSocketInstance(io: SocketIOServer) {
  socketInstance = io;
}

// Helper function to emit to specific board
export function emitToBoardRoom(boardId: string, event: string, data: any) {
  if (socketInstance) {
    socketInstance.to(`board:${boardId}`).emit(event, data);
  }
}

// Helper function to emit to specific user
export function emitToUser(userId: string, event: string, data: any) {
  if (socketInstance) {
    const sockets = Array.from(socketInstance.sockets.sockets.values());
    const userSockets = sockets.filter((socket: any) => socket.userId === userId);
    
    console.log('🔌 emitToUser:', {
      targetUserId: userId,
      event,
      totalSockets: sockets.length,
      userSocketsFound: userSockets.length,
      allConnectedUserIds: sockets.map((s: any) => s.userId)
    });
    
    userSockets.forEach((socket: any) => {
      socket.emit(event, data);
    });
  }
}