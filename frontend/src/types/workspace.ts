export interface WorkspaceMember {
  _id: string;
  username?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  owner?: string;
  members?: (string | WorkspaceMember)[];
  createdAt?: string;
  updatedAt?: string;
}
