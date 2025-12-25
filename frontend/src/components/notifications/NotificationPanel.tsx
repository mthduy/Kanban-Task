import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { notificationService, type Notification } from '../../services/notificationService';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { formatTimeAgo, formatFullDateTime } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';

const NotificationPanel = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications(showUnreadOnly);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [showUnreadOnly]);

  // Fetch unread count on mount and poll regularly
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await notificationService.getNotifications(true); // Only fetch unread
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };

    // Fetch immediately on mount
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch full notifications when panel is opened
    if (showPanel) {
      fetchNotifications();
    }
  }, [showPanel, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t('notification.markedAllAsRead'));
    } catch (err) {
      console.error('Failed to mark all as read', err);
      toast.error(t('notification.error'));
    }
  };



  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Handle board invitation - don't navigate, just show toast
    if (notification.type === 'board_invitation') {
      toast.info(t('notification.checkEmail'));
      setShowPanel(false);
      return;
    }

    // Navigate based on type
    if (notification.relatedWorkspace) {
      navigate(`/workspace/${notification.relatedWorkspace._id}`);
    } else if (notification.relatedBoard) {
      navigate(`/board/${notification.relatedBoard._id}`);
    }

    setShowPanel(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          if (!showPanel && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPanelPosition({
              top: rect.bottom + 8,
              right: window.innerWidth - rect.right,
            });
          }
          setShowPanel(!showPanel);
        }}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel using Portal */}
      {showPanel && createPortal(
        <div 
          ref={panelRef}
          className={`fixed ${isMobile ? 'left-0 right-0 px-4 rounded-b-xl' : ''} w-[min(24rem,90vw)] max-h-[70vh] glass-strong border border-border ${isMobile ? 'rounded-none' : 'rounded-xl'} shadow-glow flex flex-col`} 
          style={{ 
            top: isMobile ? 56 : `${panelPosition.top}px`,
            right: isMobile ? 0 : `${panelPosition.right}px`,
            left: isMobile ? 0 : undefined,
            zIndex: 99999 
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{t('notification.title')}</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="rounded"
                />
                {t('notification.showUnreadOnly')}
              </label>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mark all as read button */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary"
              >
                {t('notification.markAllAsRead')}
              </Button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t('notification.noNotifications')}</p>
                <p className="text-xs mt-1">{t('notification.willReceiveHere')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`group p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      )}

                      {/* Avatar */}
                      <Avatar className="flex-shrink-0 w-10 h-10">
                        {notification.sender.avatarUrl ? (
                          <img src={notification.sender.avatarUrl} alt={notification.sender.username} />
                        ) : (
                          <AvatarFallback className="bg-gradient-chat text-primary-foreground">
                            {notification.sender.displayName?.[0] || notification.sender.username[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {notification.sender.displayName || notification.sender.username}
                            </p>
                            <p className="text-sm text-foreground mt-0.5">
                              {(() => {
                                // Try to render localized message based on notification.type and available related fields
                                const senderName = notification.sender?.displayName || notification.sender?.username || '';
                                const boardTitle = notification.relatedBoard?.title || '';
                                const workspaceName = notification.relatedWorkspace?.name || '';

                                const raw = notification.message || '';
                                const looksLikeFullSentence = /\b(đã|created|added|removed|deleted|đổi|xóa)\b/i.test(raw);

                                switch (notification.type) {
                                  // Workspace events
                                  case 'workspace_invite':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.workspaceMemberAdded', { sender: senderName, name: notification.message || '', workspace: workspaceName });
                                  case 'workspace_remove':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.workspaceMemberRemoved', { sender: senderName, name: notification.message || '', workspace: workspaceName });
                                  case 'workspace_deleted':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.workspaceDeleted', { workspace: workspaceName });
                                  
                                  case 'board_member_added':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.boardMemberAdded', { sender: senderName, board: boardTitle });
                                  case 'board_member_left':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.boardMemberLeft', { name: senderName, board: boardTitle });
                                  case 'board_member_removed':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.boardMemberRemoved', { sender: senderName, name: notification.message || '' });
                                  case 'board_deleted':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.boardDeleted', { board: boardTitle });
                                  case 'card_deleted':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.cardDeleted', { sender: senderName, card: notification.relatedCard?.title || '' });
                                  case 'card_renamed':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.cardRenamed', { sender: senderName, card: notification.relatedCard?.title || '' });
                                  case 'card_assigned':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.cardAssigned', { sender: senderName, card: notification.message || '' });
                                  case 'card_moved':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.cardMoved', { sender: senderName, card: notification.message || '' });
                                  case 'list_created':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.listCreated', { sender: senderName, list: notification.message || '', board: boardTitle });
                                  case 'list_updated':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.listUpdated', { sender: senderName, list: notification.message || '', board: boardTitle });
                                  case 'list_deleted':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.listDeleted', { sender: senderName, list: notification.message || '', board: boardTitle });
                                  case 'board_invitation':
                                    return t('notification.invitedToBoard');
                                  case 'card_due_reminder':
                                    if (looksLikeFullSentence) return raw;
                                    return t('notification.cardDueReminder', { card: notification.relatedCard?.title || '' });
                                  default:
                                    return raw;
                                }
                              })()}
                            </p>
                            {notification.relatedWorkspace && (
                              <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                                {notification.relatedWorkspace.name}
                              </div>
                            )}
                            <p 
                              className="text-xs text-muted-foreground mt-1"
                              title={formatFullDateTime(notification.createdAt)}
                            >
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id);
                                }}
                                className="p-1.5 hover:bg-muted rounded"
                                aria-label="Mark as read"
                              >
                                <Check className="w-4 h-4 text-primary" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationPanel;
