export interface Board {
  _id: string;
  title: string;
  description?: string;
  background?: string;
  owner?: string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
  members?: Array<string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string }>;
  workspace?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListItem {
  _id: string;
  title: string;
  boardId: string;
  position: number;
}

export interface CardItem {
  _id: string;
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  /** Status string derived from the list title (e.g., 'To Do', 'Done') */
  status?: string;
  position: number;
  completed?: boolean;
  members?: Array<string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string }>;
  labels?: Array<{ _id?: string; color: string; name: string }>;
  comments?: Array<{
    _id: string;
    text: string;
    author?: { _id?: string; displayName?: string; username?: string; avatarUrl?: string } | string;
    createdAt?: string;
  }>;
  activities?: Array<{
    _id: string;
    type: 'label' | 'member' | 'update' | 'complete' | 'incomplete' | 'created';
    user?: { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
    text: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }>;
  dueDate?: string | null;
  createdAt?: string;
  createdBy?: { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
}
