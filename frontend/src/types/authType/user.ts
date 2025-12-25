export interface User {
  _id: string;
  username: string;
  password: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  avatarId?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
