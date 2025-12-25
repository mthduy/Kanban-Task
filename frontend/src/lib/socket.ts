import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';

// Types for socket events
interface SocketBoard {
  _id: string;
  title: string;
  description?: string;
  background?: string;
  [key: string]: unknown;
}

interface SocketList {
  _id: string;
  title: string;
  boardId: string;
  [key: string]: unknown;
}

interface SocketCard {
  _id: string;
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  [key: string]: unknown;
}

interface SocketEventData {
  board?: SocketBoard;
  list?: SocketList;
  card?: SocketCard;
  action?: string;
  updatedBy?: { id: string; email?: string };
  [key: string]: unknown;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.socket?.connected || this.isConnecting) {
      return this.socket;
    }

    this.isConnecting = true;
    const token = useAuthStore.getState().accessToken;
    
    if (!token) {
      console.warn('No authentication token found');
      return null;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 5000,
      forceNew: false
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      
      // Only attempt to reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      if (error.message === 'Authentication failed') {
        console.error('Socket authentication failed');
        useAuthStore.getState().logout();
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff with max delay of 10 seconds
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      10000
    );
    
    setTimeout(() => {
      if (this.socket?.connected) return;
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Board room management
  joinBoard(boardId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-board', boardId);
    }
  }

  leaveBoard(boardId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-board', boardId);
    }
  }

  // Board events
  emitBoardUpdated(boardId: string, board: SocketBoard, action: string = 'update') {
    if (this.socket?.connected) {
      this.socket.emit('board-updated', { boardId, board, action });
    }
  }

  emitBoardDeleted(boardId: string) {
    if (this.socket?.connected) {
      this.socket.emit('board-deleted', { boardId });
    }
  }

  // List events
  emitListCreated(boardId: string, list: SocketList) {
    if (this.socket?.connected) {
      this.socket.emit('list-created', { boardId, list });
    }
  }

  emitListUpdated(boardId: string, list: SocketList, action: string = 'update') {
    if (this.socket?.connected) {
      this.socket.emit('list-updated', { boardId, list, action });
    }
  }

  emitListDeleted(boardId: string, listId: string) {
    if (this.socket?.connected) {
      this.socket.emit('list-deleted', { boardId, listId });
    }
  }

  emitListsReordered(boardId: string, lists: SocketList[]) {
    if (this.socket?.connected) {
      this.socket.emit('lists-reordered', { boardId, lists });
    }
  }

  // Card events
  emitCardCreated(boardId: string, card: SocketCard) {
    if (this.socket?.connected) {
      this.socket.emit('card-created', { boardId, card });
    }
  }

  emitCardUpdated(boardId: string, card: SocketCard, action: string = 'update') {
    if (this.socket?.connected) {
      this.socket.emit('card-updated', { boardId, card, action });
    }
  }

  emitCardDeleted(boardId: string, cardId: string, listId: string) {
    if (this.socket?.connected) {
      this.socket.emit('card-deleted', { boardId, cardId, listId });
    }
  }

  emitCardMoved(boardId: string, cardId: string, fromListId: string, toListId: string, newPosition?: number) {
    if (this.socket?.connected) {
      this.socket.emit('card-moved', { boardId, cardId, fromListId, toListId, newPosition });
    }
  }

  emitCardsReordered(boardId: string, listId: string, cards: SocketCard[]) {
    if (this.socket?.connected) {
      this.socket.emit('cards-reordered', { boardId, listId, cards });
    }
  }

  // Typing indicators
  emitUserTyping(boardId: string, cardId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('user-typing', { boardId, cardId, isTyping });
    }
  }

  // User presence
  emitCursorMoved(boardId: string, position: { x: number; y: number }) {
    if (this.socket?.connected) {
      this.socket.emit('cursor-moved', { boardId, position });
    }
  }

  // Event listeners helpers
  onBoardUpdated(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('board-updated', callback);
    }
  }

  onBoardDeleted(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('board-deleted', callback);
    }
  }

  onListCreated(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('list-created', callback);
    }
  }

  onListUpdated(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('list-updated', callback);
    }
  }

  onListDeleted(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('list-deleted', callback);
    }
  }

  onListsReordered(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('lists-reordered', callback);
    }
  }

  onCardCreated(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('card-created', callback);
    }
  }

  onCardUpdated(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('card-updated', callback);
    }
  }

  onCardDeleted(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('card-deleted', callback);
    }
  }

  onCardMoved(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('card-moved', callback);
    }
  }

  onCardsReordered(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('cards-reordered', callback);
    }
  }

  onUserTyping(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onUserJoinedBoard(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('user-joined-board', callback);
    }
  }

  onUserLeftBoard(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('user-left-board', callback);
    }
  }

  onCursorMoved(callback: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.on('cursor-moved', callback);
    }
  }

  // Remove specific event listeners
  off(event: string, callback?: (data: SocketEventData) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event: string) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
