import api from '../lib/axios';

export interface UpcomingCard {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  boardId: {
    _id: string;
    title: string;
  };
  listId: {
    _id: string;
    title: string;
  };
  completed: boolean;
}

export interface UpcomingCardsResponse {
  cards: UpcomingCard[];
  count: number;
  message: string;
}

export interface ReminderResponse {
  message: string;
}

export interface DebugCardsResponse {
  cardsWithDueDate: UpcomingCard[];
  userMemberCards: UpcomingCard[];
  totalCards: number;
  cards: UpcomingCard[];
  message?: string;
}

export const reminderService = {
  // Get upcoming due cards for current user
  getUpcomingCards: async (days: number = 1, includeCompleted: boolean = false): Promise<UpcomingCardsResponse> => {
    const response = await api.get(`/reminders/upcoming?days=${days}&includeCompleted=${includeCompleted}`);
    return response.data;
  },

  // Debug all cards for current user
  debugUserCards: async (): Promise<DebugCardsResponse> => {
    const response = await api.get('/reminders/debug');
    return response.data;
  },

  // Debug all cards to check membership
  debugAllCards: async (): Promise<DebugCardsResponse> => {
    const response = await api.get('/reminders/debug-all');
    return response.data;
  },

  // Manually trigger due reminder check
  triggerReminderCheck: async (): Promise<ReminderResponse> => {
    const response = await api.post('/reminders/check');
    return response.data;
  },

  // Send manual reminder for specific card
  sendManualReminder: async (cardId: string): Promise<ReminderResponse> => {
    const response = await api.post(`/reminders/send/${cardId}`);
    return response.data;
  },
};

export default reminderService;