// Socket Event Data Types for BoardPage
export interface SocketUser {
  id: string;
  email?: string;
}

export interface SocketBoard {
  _id: string;
  title: string;
  description?: string;
  background?: string;
  owner: string | { _id: string; displayName?: string; username?: string; avatarUrl?: string };
  members: Array<string | { _id: string; displayName?: string; username?: string; avatarUrl?: string }>;
  workspace: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocketList {
  _id: string;
  title: string;
  boardId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SocketCard {
  _id: string;
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  position?: number;
  labels?: Array<{ _id?: string; color: string; name: string }>;
  members?: Array<string | { _id: string; displayName?: string; username?: string; avatarUrl?: string }>;
  dueDate?: string;
  completed?: boolean;
  comments?: Array<{
    _id: string;
    text: string;
    author?: string | { _id: string; displayName?: string; username?: string; avatarUrl?: string };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface BoardUpdatedData {
  board?: SocketBoard;
  action?: string;
  updatedBy?: SocketUser;
  [key: string]: unknown;
}

export interface ListCreatedData {
  list?: SocketList;
  createdBy?: SocketUser;
  [key: string]: unknown;
}

export interface ListUpdatedData {
  list?: SocketList;
  action?: string;
  updatedBy?: SocketUser;
  [key: string]: unknown;
}

export interface ListDeletedData {
  listId?: string;
  deletedBy?: SocketUser;
  [key: string]: unknown;
}

export interface CardCreatedData {
  card?: SocketCard;
  createdBy?: SocketUser;
  [key: string]: unknown;
}

export interface CardUpdatedData {
  card?: SocketCard;
  action?: string;
  updatedBy?: SocketUser;
  [key: string]: unknown;
}

export interface CardDeletedData {
  cardId?: string;
  listId?: string;
  deletedBy?: SocketUser;
  [key: string]: unknown;
}

export interface CardMovedData {
  cardId?: string;
  fromListId?: string;
  toListId?: string;
  newPosition?: number;
  movedBy?: SocketUser;
  [key: string]: unknown;
}

// Union type for all socket event data
export type SocketEventData = 
  | BoardUpdatedData
  | ListCreatedData
  | ListUpdatedData
  | ListDeletedData
  | CardCreatedData
  | CardUpdatedData
  | CardDeletedData
  | CardMovedData;

// Board related types
export interface Board {
  _id: string;
  title: string;
  description?: string;
  background?: string;
  owner: string | { _id: string; displayName?: string; username?: string; avatarUrl?: string };
  members: Array<string | { _id: string; displayName?: string; username?: string; avatarUrl?: string }>;
  workspace: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  _id: string;
  title: string;
  boardId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CardItem {
  _id: string;
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  position?: number;
  labels?: Array<{ _id?: string; color: string; name: string }>;
  members?: Array<string | { _id: string; displayName?: string; username?: string; avatarUrl?: string }>;
  dueDate?: string;
  completed?: boolean;
  comments?: Array<{
    _id: string;
    text: string;
    author?: string | { _id: string; displayName?: string; username?: string; avatarUrl?: string };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

// Filter options for cards
export interface CardFilterOptions {
  completed?: boolean;
  members?: string[];
  labelNames?: string[];
  labelColors?: string[];
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
}