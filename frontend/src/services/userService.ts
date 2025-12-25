import api from '@/lib/axios';

export interface User {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export const findUserByEmail = async (email: string): Promise<User> => {
  const response = await api.get(`/users/find?email=${encodeURIComponent(email)}`);
  return response.data.user;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
  return response.data.users;
};

export default {
  findUserByEmail,
  searchUsers,
};
