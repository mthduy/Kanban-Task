import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { reminderService } from '../../services/reminderService';
import type { UpcomingCard } from '../../services/reminderService';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { t } from 'i18next';

const UpcomingCardsWidget = () => {
  const navigate = useNavigate();
  const [upcomingCards, setUpcomingCards] = useState<UpcomingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysAhead, setDaysAhead] = useState(1);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const handleCardClick = (card: UpcomingCard) => {
    // Navigate to board page with card modal using nested route
    navigate(`/board/${card.boardId._id}/card/${card._id}`);
  };

  

  const fetchUpcomingCards = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 Fetching cards for ${daysAhead} days`);
      const response = await reminderService.getUpcomingCards(daysAhead, true); // Always include completed
      console.log(`🔍 Fetched ${response.cards.length} upcoming cards:`, response.cards);
      setUpcomingCards(response.cards);
    } catch (err) {
      setError('Không thể tải danh sách thẻ sắp đến hạn');
      console.error('Error fetching upcoming cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingCards();
  }, [daysAhead]);

  const handleSendReminder = async (cardId: string) => {
    setSendingReminder(cardId);
    try {
      await reminderService.sendManualReminder(cardId);
      toast.success('Nhắc nhở đã được gửi thành công!');
      console.log('Reminder sent successfully');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể gửi nhắc nhở';
      toast.error(errorMessage);
      console.error('Error sending reminder:', err);
    } finally {
      setSendingReminder(null);
    }
  };

  const getDueSeverity = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'overdue';
    if (diffHours < 24) return 'urgent';
    if (diffHours < 48) return 'warning';
    return 'normal';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'overdue': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50 border-red-200 dark:border-red-800';
      case 'urgent': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800';
      default: return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium sm:font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{t('workspace.dueCard')}</h3>
        </div>
        <div className="text-center py-6 sm:py-8">
          <div className="inline-block animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium sm:font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{t('workspace.dueCard')}</h3>
          {upcomingCards.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-200 dark:border-blue-700">
              {upcomingCards.length}
            </span>
          )}
        </div>
        <select
          value={daysAhead}
          onChange={(e) => setDaysAhead(Number(e.target.value))}
          className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value={1}>{t('dayOptions.motNgay')}</option>
          <option value={3}>{t('dayOptions.baNgay')}</option>
          <option value={7}>{t('dayOptions.bayNgay')}</option>
          <option value={30}>{t('dayOptions.bamuoiNgay')}</option>
        </select>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      {upcomingCards.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('workspace.noCardsDue')}</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {upcomingCards.map((card) => {
            const severity = getDueSeverity(card.dueDate);
            const severityColor = getSeverityColor(severity);
            const isCompleted = (card as UpcomingCard & { completed?: boolean }).completed;
            
            return (
              <div
                key={card._id}
                className={`p-2 sm:p-3 rounded-lg border ${severityColor} ${isCompleted ? 'opacity-60' : ''} cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                onClick={() => handleCardClick(card)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      {card.title}
                      {isCompleted && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-green-200 dark:border-green-700">✓ Hoàn thành</span>}
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span>{card.boardId.title}</span>
                        <span>•</span>
                        <span>{card.listId.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(card.dueDate), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:ml-2">
                    {severity === 'overdue' && (
                      <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReminder(card._id);
                      }}
                      disabled={sendingReminder === card._id}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Gửi nhắc nhở"
                    >
                      {sendingReminder === card._id ? 'Đang gửi...' : 'Nhắc nhở'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      
    </div>
  );
};

export default UpcomingCardsWidget;