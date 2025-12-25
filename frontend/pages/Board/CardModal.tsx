import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTimeAgo, formatFullDateTime } from '@/lib/dateUtils';
import cardService from '@/services/cardService';
import userService from '@/services/userService';
import attachmentService, { type Attachment } from '@/services/attachmentService';
import AttachmentUpload from '@/components/board/AttachmentUpload';
import AttachmentList from '@/components/board/AttachmentList';
import type { Board, ListItem, CardItem } from '@/types/board';
import type { User } from '@/services/userService';
import { toast } from 'sonner';

type OutletContextType = {
  board: Board | null;
  lists: ListItem[];
  cards: CardItem[];
  setCards: React.Dispatch<React.SetStateAction<CardItem[]>>;
  user?: { _id?: string; username?: string; displayName?: string; avatarUrl?: string } | null | undefined;
  commentText: string;
  setCommentText: (s: string) => void;
  postingComment: boolean;
  handlePostComment: (cardId: string) => Promise<void>;
  handleDeleteComment: (cardId: string, commentId: string) => Promise<void>;
  handleAddMember: (cardId: string, memberId: string) => Promise<void>;
  handleRemoveMember: (cardId: string, memberId: string) => Promise<void>;
  handleAddLabel: (cardId: string, labelText: string) => Promise<void>;
  handleRemoveLabel: (cardId: string, label: string) => Promise<void>;
  parseLabel: (label: string | { color: string; name: string }) => { color: string; text: string };
  handleToggleComplete: (cardId: string, currentStatus: boolean) => Promise<void>;
  handleEditCardSubmit: (e?: React.FormEvent) => Promise<void>;
  handleDeleteCard: () => Promise<void>;
  setShowEditCard: (b: boolean) => void;
  setEditingCardId: (id: string | null) => void;
  setEditCardTitle: (s: string) => void;
  setEditCardDesc: (s: string) => void;
  setOpenCardMenu: (s: string | null) => void;
};

export default function CardModal({ ctxProp }: { ctxProp?: OutletContextType }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cardId } = useParams();
  const outletCtx = useOutletContext<OutletContextType>();
  const ctx = ctxProp ?? outletCtx;

  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [newLabelTextLocal, setNewLabelTextLocal] = useState('');
  const [selectedLabelColorLocal, setSelectedLabelColorLocal] = useState('#3b82f6');
  const [labelSearchText, setLabelSearchText] = useState('');
  const [memberSearchText, setMemberSearchText] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const labelColors = [
    { name: 'Xanh dương', value: '#3b82f6' },
    { name: 'Xanh lá', value: '#10b981' },
    { name: 'Đỏ', value: '#ef4444' },
    { name: 'Vàng', value: '#f59e0b' },
    { name: 'Tím', value: '#8b5cf6' },
    { name: 'Hồng', value: '#ec4899' },
    { name: 'Cam', value: '#f97316' },
    { name: 'Xanh lơ', value: '#06b6d4' },
    { name: 'Xám', value: '#6b7280' },
  ];

  const [showDueEditor, setShowDueEditor] = useState(false);
  const [dueDateLocal, setDueDateLocal] = useState<string>('');
  const [, setRerender] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [showActivityDetails, setShowActivityDetails] = useState(true);

  // Attachment states
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const card = ctx?.cards.find((c) => String(c._id) === String(cardId));

  // State cho local activities (chỉ trong session, không dùng nữa vì giờ lưu vào DB)
  const [localActivities] = useState<Array<{
    id: string;
    type: 'comment' | 'label' | 'member' | 'update' | 'complete' | 'incomplete' | 'created';
    user: string;
    userData?: { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
    text: string;
    time: Date;
    metadata?: unknown;
  }>>([]);

  // Tạo combined activities từ card data (persistent) + local activities (session)
  const getAllActivities = () => {
    const allActivities: Array<{
      id: string;
      type: string;
      user: string;
      userData?: { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
      text: string;
      time: Date;
      isComment?: boolean;
      commentData?: unknown;
    }> = [];

    // 1. Thêm activity "tạo thẻ"
    if (card?.createdAt && card?.createdBy) {
      const creator = card.createdBy;
      const creatorName = creator.displayName || creator.username || 'Người dùng';
      allActivities.push({
        id: `created-${card._id}`,
        type: 'created',
        user: creatorName,
        userData: creator,
        text: 'đã tạo thẻ này',
        time: new Date(card.createdAt)
      });
    }

    // 2. Thêm activities từ database (persistent)
    if (card?.activities) {
      card.activities.forEach(act => {
        const author = act.user;
        let authorName = 'Người dùng';
        let authorData = undefined;
        
        if (typeof author === 'object' && author) {
          authorName = author.displayName || author.username || 'Người dùng';
          authorData = author;
        } else if (typeof author === 'string' && author === ctx.user?._id) {
          // Nếu author là ID string và trùng với current user
          authorName = ctx.user?.displayName || ctx.user?.username || 'Người dùng';
          authorData = ctx.user;
        }
        
        allActivities.push({
          id: act._id || `act-${Date.now()}-${Math.random()}`,
          type: act.type,
          user: authorName,
          userData: authorData,
          text: act.text,
          time: new Date(act.createdAt || Date.now())
        });
      });
    }

    // 3. Thêm local activities (các hoạt động trong session hiện tại chưa reload)
    localActivities.forEach(act => {
      allActivities.push({
        id: act.id,
        type: act.type,
        user: act.user,
        userData: act.userData,
        text: act.text,
        time: act.time
      });
    });

    // 4. Thêm comments như activities
    if (card?.comments) {
      card.comments.forEach(cm => {
        const author = cm.author;
        let authorName = 'Người dùng';
        let authorData = undefined;
        
        if (typeof author === 'object' && author) {
          authorName = author.displayName || author.username || 'Người dùng';
          authorData = author;
        } else if (typeof author === 'string' && author === ctx.user?._id) {
          // Nếu author là ID string và trùng với current user
          authorName = ctx.user?.displayName || ctx.user?.username || 'Người dùng';
          authorData = ctx.user;
        }
        
        allActivities.push({
          id: `comment-${cm._id}`,
          type: 'comment',
          user: authorName,
          userData: authorData,
          text: cm.text,
          time: new Date(cm.createdAt || Date.now()),
          isComment: true,
          commentData: cm
        });
      });
    }

    // Sort theo thời gian mới nhất
    return allActivities.sort((a, b) => b.time.getTime() - a.time.getTime());
  };

  // Wrapped handlers với activity tracking
  const handleAddLabelWithActivity = async (cardId: string, color: string, name: string) => {
    const newLabel = { color, name };
    const currentLabels = card?.labels || [];
    
    try {
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      if (boardId && listId) {
        const result = await cardService.update(String(boardId), String(listId), cardId, { 
          labels: [...currentLabels, newLabel],
          activity: { 
            type: 'label', 
            text: `đã thêm nhãn "${name}" vào thẻ này` 
          }
        } as { labels: Array<{color: string; name: string}>; activity: { type: string; text: string } });
        // Update cards state to reflect new activity immediately
        if (ctx.setCards) {
          ctx.setCards((prevCards: CardItem[]) => {
            const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
            if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
            return [...prevCards, result.card];
          });
        }
        toast.success('Đã thêm nhãn');
      }
    } catch (err) {
      console.error('Add label error', err);
      toast.error('Thêm nhãn thất bại');
    }
  };

  const handleRemoveLabelWithActivity = async (cardId: string, labelId: string) => {
    const label = card?.labels?.find(l => l._id === labelId || (l.color + l.name) === labelId);
    if (!label) return;
    
    const currentLabels = card?.labels || [];
    const newLabels = currentLabels.filter(l => (l._id || (l.color + l.name)) !== labelId);
    
    try {
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      if (boardId && listId) {
        const result = await cardService.update(String(boardId), String(listId), cardId, { 
          labels: newLabels,
          activity: {
            type: 'label',
            text: `đã xóa nhãn "${label.name}" khỏi thẻ này`
          }
        } as { labels: Array<{color: string; name: string}>; activity: { type: string; text: string } });
        // Update cards state to reflect new activity immediately
        if (ctx.setCards) {
          ctx.setCards((prevCards: CardItem[]) => {
            const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
            if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
            return [...prevCards, result.card];
          });
        }
        toast.success('Đã xóa nhãn');
      }
    } catch (err) {
      console.error('Remove label error', err);
      toast.error('Xóa nhãn thất bại');
    }
  };

  const handleAddMemberWithActivity = async (cardId: string, memberId: string) => {
    try {
      const member = ctx.board?.members?.find(m => {
        if (typeof m === 'string') return m === memberId;
        return (m as { _id?: string })._id === memberId;
      });
      const name = typeof member === 'object' && member ? ((member as { displayName?: string; username?: string }).displayName || (member as { displayName?: string; username?: string }).username) : 'thành viên';
      
      // Get current members
      const currentMembers = card?.members || [];
      const memberIds = currentMembers.map((m) => typeof m === 'string' ? m : (m as { _id?: string })._id).filter(Boolean) as string[];
      
      // Check if member already exists
      if (memberIds.includes(memberId)) {
        toast.info('Thành viên đã có trong thẻ');
        return;
      }

      const updatedMembers = [...memberIds, memberId];
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      
      if (boardId && listId) {
        // GỌI API 1 LẦN DUY NHẤT với cả members và activity
        const result = await cardService.update(String(boardId), String(listId), cardId, { 
          members: updatedMembers,
          activity: { type: 'member', text: `đã thêm ${name} vào thẻ này` }
        } as { members: string[]; activity: { type: string; text: string } });
        
        // Update cards state immediately
        if (ctx.setCards) {
          ctx.setCards((prevCards: CardItem[]) => {
            const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
            if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
            return [...prevCards, result.card];
          });
        }
        toast.success('Đã thêm thành viên vào thẻ');
      }
    } catch (err) {
      console.error('Add member error:', err);
      toast.error('Thêm thành viên thất bại');
    }
  };

  const handleRemoveMemberWithActivity = async (cardId: string, memberId: string) => {
    try {
      const member = ctx.board?.members?.find(m => {
        if (typeof m === 'string') return m === memberId;
        return (m as { _id?: string })._id === memberId;
      });
      const name = typeof member === 'object' && member ? ((member as { displayName?: string; username?: string }).displayName || (member as { displayName?: string; username?: string }).username) : 'thành viên';
      
      // Get current members and remove the specified member
      const currentMembers = card?.members || [];
      const memberIds = currentMembers.map((m) => typeof m === 'string' ? m : (m as { _id?: string })._id).filter(Boolean) as string[];
      const updatedMembers = memberIds.filter(id => String(id) !== String(memberId));
      
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      
      if (boardId && listId) {
        // GỌI API 1 LẦN DUY NHẤT với cả members và activity
        const result = await cardService.update(String(boardId), String(listId), cardId, { 
          members: updatedMembers,
          activity: { type: 'member', text: `đã xóa ${name} khỏi thẻ này` }
        } as { members: string[]; activity: { type: string; text: string } });
        
        // Update cards state immediately
        if (ctx.setCards) {
          ctx.setCards((prevCards: CardItem[]) => {
            const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
            if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
            return [...prevCards, result.card];
          });
        }
        toast.success('Đã xóa thành viên khỏi thẻ');
      }
    } catch (err) {
      console.error('Remove member error:', err);
      toast.error('Xóa thành viên thất bại');
    }
  };

  const isoToLocalInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  React.useEffect(() => {
    if (card) {
      setDueDateLocal(isoToLocalInput((card as CardItem).dueDate));
      setTitleValue(card.title || '');
      setDescValue(card.description || '');
      // Load attachments
      loadAttachments();
    }
  }, [card]);

  // Load attachments for the card
  const loadAttachments = async () => {
    if (!card?._id) return;
    try {
      setLoadingAttachments(true);
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      const attachmentsData = await attachmentService.getAttachments(
        String(card._id),
        String(boardId),
        String(listId)
      );
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast.error('Lỗi khi tải tệp đính kèm');
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Handle file upload
  const handleUploadAttachment = async (file: File) => {
    if (!card?._id) return;
    try {
      setUploadingAttachment(true);
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      const newAttachment = await attachmentService.uploadAttachment(
        String(card._id),
        file,
        String(boardId),
        String(listId)
      );
      setAttachments([...attachments, newAttachment]);
      setShowAttachmentUpload(false);
      toast.success('Tệp đã được tải lên thành công');
    } catch (error) {
      console.error('Error uploading attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi tải lên tệp';
      toast.error(errorMessage);
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!card?._id) return;
    try {
      setDeletingAttachmentId(attachmentId);
      const boardId = ctx.board?._id;
      const listId = card?.listId;
      await attachmentService.deleteAttachment(
        String(card._id),
        attachmentId,
        String(boardId),
        String(listId)
      );
      setAttachments(attachments.filter((a) => a._id !== attachmentId));
      toast.success('Tệp đã bị xóa');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi xóa tệp';
      const apiErrorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(apiErrorMessage || errorMessage);
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  // Search users when memberSearchText changes
  useEffect(() => {
    const searchMembersDebounced = async () => {
      if (memberSearchText.trim().length < 2) {
        setSearchedUsers([]);
        return;
      }

      setSearchingUsers(true);
      try {
        const users = await userService.searchUsers(memberSearchText.trim());
        setSearchedUsers(users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchedUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timeoutId = setTimeout(searchMembersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [memberSearchText]);

  if (!card) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-none sm:rounded-lg">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={async () => {
                  setEditingTitle(false);
                  if (titleValue.trim() && titleValue !== card.title) {
                    try {
                      const boardId = ctx.board?._id;
                      const listId = card.listId;
                      if (boardId && listId) {
                        const oldTitle = card.title;
                        const result = await cardService.update(String(boardId), String(listId), String(card._id), { 
                          title: titleValue.trim(),
                          activity: {
                            type: 'update',
                            text: `đổi tiêu đề từ "${oldTitle}" thành "${titleValue.trim()}"`
                          }
                        } as { title: string; activity: { type: string; text: string } });
                        // Update cards state immediately
                        if (ctx.setCards) {
                          ctx.setCards((prevCards: CardItem[]) => {
                            const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
                            if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
                            return [...prevCards, result.card];
                          });
                        }
                        toast.success('Đã cập nhật tiêu đề');
                      }
                    } catch (err) {
                      console.error('update title error', err);
                      toast.error('Cập nhật tiêu đề thất bại');
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') { setTitleValue(card.title); setEditingTitle(false); }
                }}
                autoFocus
                className="text-xl font-semibold text-gray-900 dark:text-white w-full bg-transparent border-b-2 border-blue-500 focus:outline-none"
              />
            ) : (
              <h2 
                className="text-xl font-semibold text-gray-900 dark:text-white truncate cursor-pointer"
                onDoubleClick={() => setEditingTitle(true)}
                
              >
                {card.title}
              </h2>
            )}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content - responsive: single column on small screens, two columns on desktop */}
        <div className="flex-1 overflow-y-auto flex flex-col sm:flex-row gap-4 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4 min-h-0 sm:min-h-[600px] max-h-full sm:max-h-[600px]">
          {/* Left column - Main content */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setShowMemberMenu(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                {t('board.members')}
              </button>
              <button 
                onClick={() => setShowLabelMenu(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                {t('board.labels')}
              </button>
              <button 
                onClick={() => setShowDueEditor(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {t('card.addDueDate')}
              </button>
          
              <button 
                onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {t('card.attachments')}
              </button>
            </div>

            {/* Members Section - Thành viên */}
            {card.members && card.members.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('board.members')}
                </h4>

                <div className="flex flex-wrap gap-2">
                  {card.members.map((member) => {
                    const memberId =
                      typeof member === 'string'
                        ? member
                        : (member as { _id?: string })._id;

                    const memberName =
                      typeof member === 'string'
                        ? 'Thành viên'
                        : (member as { displayName?: string; username?: string })
                            .displayName ||
                          (member as { username?: string }).username ||
                          'Thành viên';

                    const memberAvatar =
                      typeof member === 'object' && member
                        ? (member as { avatarUrl?: string }).avatarUrl
                        : undefined;

                    const initial = memberName[0]?.toUpperCase() || 'U';

                    return (
                      <div
                        key={String(memberId)}
                        className="
                          group
                          relative
                          inline-flex
                          items-center
                          justify-center
                          gap-2
                          px-3
                          py-1.5
                          rounded
                          bg-gray-100
                          dark:bg-gray-700
                          hover:bg-gray-200
                          dark:hover:bg-gray-600
                          transition-colors
                        "
                      >
                        {/* Remove button (hover only, no layout shift) */}
                        <button
                          onClick={() =>
                            handleRemoveMemberWithActivity(
                              String(card._id),
                              String(memberId)
                            )
                          }
                          className="
                            absolute
                            -top-1
                            -right-1
                            opacity-0
                            group-hover:opacity-100
                            transition-opacity
                            bg-white
                            dark:bg-gray-800
                            rounded-full
                            p-0.5
                            hover:bg-red-100
                            dark:hover:bg-red-900/30
                          "
                          aria-label="Xóa thành viên"
                        >
                          <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                        </button>

                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                          {memberAvatar ? (
                            <img
                              src={memberAvatar}
                              alt={memberName}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            initial
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {memberName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

           {/* Labels Section - Nhãn */}
{card.labels && card.labels.length > 0 && (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {t('board.labels')}
    </h4>
    <div className="flex flex-wrap gap-2">
      {card.labels.map((label, index) => {
        const labelId = label._id || `label-${index}`;
        return (
          <span 
            key={labelId} 
            className="group relative inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm justify-center font-medium text-white transition-all duration-200 hover:pr-8" 
            style={{ backgroundColor: label.color }}
          >
            <span className="whitespace-nowrap">{label.name}</span>
            <button 
              onClick={() => handleRemoveLabelWithActivity(String(card._id), labelId)} 
              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-black/20 active:bg-black/30 rounded-full p-1 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50" 
              aria-label={`${t('common.delete')} ${label.name}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        );
      })}
    </div>
  </div>
)}

            {/* Attachments Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('card.attachments')} ({attachments.length})
              </h4>
              
              {showAttachmentUpload && (
                <div className="mb-4">
                  <AttachmentUpload
                    onFileSelect={handleUploadAttachment}
                    isLoading={uploadingAttachment}
                    disabled={uploadingAttachment}
                  />
                </div>
              )}

              {loadingAttachments ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Đang tải tệp đính kèm...
                </div>
              ) : (
                <AttachmentList
                  attachments={attachments}
                  onDelete={handleDeleteAttachment}
                  isDeleting={deletingAttachmentId}
                  canDelete={true}
                />
              )}
            </div>

            {/* Description - Sự miêu tả */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('card.description')}</h4>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    className="w-full min-h-32 px-3 py-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    autoFocus
                    placeholder={t('card.addDescription')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setEditingDesc(false);
                        try {
                          const boardId = ctx.board?._id;
                          const listId = card.listId;
                          if (boardId && listId) {
                            const activityText = card.description ? 'đã chỉnh sửa mô tả của thẻ này' : 'đã thêm mô tả vào thẻ này';
                            const result = await cardService.update(String(boardId), String(listId), String(card._id), { 
                              description: descValue.trim(),
                              activity: {
                                type: 'update',
                                text: activityText
                              }
                            } as { description: string; activity: { type: string; text: string } });
                            // Update cards state immediately
                            if (ctx.setCards) {
                              ctx.setCards((prevCards: CardItem[]) => {
                                const exists = prevCards.some((c) => String(c._id) === String(result.card._id));
                                if (exists) return prevCards.map((c) => String(c._id) === String(result.card._id) ? result.card : c);
                                return [...prevCards, result.card];
                              });
                            }
                            toast.success('Đã cập nhật mô tả');
                          }
                        } catch (err) {
                          console.error('update description error', err);
                          toast.error('Cập nhật mô tả thất bại');
                        }
                      }}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                    >
                      {t('common.send')}
                    </button>
                    <button
                      onClick={() => {
                        setDescValue(card.description || '');
                        setEditingDesc(false);
                      }}
                      className="px-4 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : card.description ? (
                <div 
                  className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm whitespace-pre-wrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onDoubleClick={() => setEditingDesc(true)}
                  title="Double-click để chỉnh sửa"
                >
                  {card.description}
                </div>
              ) : (
                <button 
                  className="w-full text-left px-3 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-600 dark:text-gray-400"
                  onClick={() => setEditingDesc(true)}
                >
                  {t('card.addDescription')}
                </button>
              )}
            </div>
          </div>

          {/* Right column - Activity và Comments (stack under main on small screens) */}
          <div className="w-full sm:w-96 min-w-0 sm:min-w-[24rem] max-w-full sm:max-w-[24rem] shrink-0 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('card.activities')}</h4>
                <button 
                  onClick={() => setShowActivityDetails(!showActivityDetails)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showActivityDetails ? t('card.hideDetails') : t('card.showDetails')}
                </button>
              </div>
              
              <div className={showActivityDetails ? '' : 'invisible h-0 overflow-hidden'}>
                  {/* Comment input */}
                  <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {ctx.user?.avatarUrl ? <img src={ctx.user.avatarUrl} alt={ctx.user.username} className="w-full h-full object-cover rounded-full" /> : (ctx.user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <input 
                        value={ctx.commentText} 
                        onChange={(e) => ctx.setCommentText(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (card._id) ctx.handlePostComment(card._id); } }} 
                        type="text" 
                        placeholder={t('card.writeComment')} 
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <div className="flex items-center gap-2 mt-2 right-0">
                        <Button 
                          onClick={() => { if (card._id) ctx.handlePostComment(card._id); }} 
                          className="px-4 py-1.5 rounded text-sm h-auto" 
                          disabled={ctx.postingComment || ctx.commentText.trim().length === 0}
                        >
                          {t('common.send')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Activity list - Combined activities and comments */}
                  <div className="space-y-3 mt-4">
                  {/* Activities */}
                  {getAllActivities().map((activity) => {
                  const timeAgo = formatTimeAgo(activity.time);
                  const fullDateTime = formatFullDateTime(activity.time);

                  // Nếu là comment, hiển thị với box
                  if (activity.isComment) {
                    type _Comment = { _id: string; text: string; author?: unknown; createdAt?: string };
                    const cm = activity.commentData as _Comment;
                    type _Author = { _id?: string; displayName?: string; username?: string; avatarUrl?: string } | string | undefined;
                    const author = cm.author as _Author;
                    const isAuthor = (() => {
                      if (!author) return false;
                      if (typeof author === 'string') return String(author) === String(ctx.user?._id);
                      return String((author as { _id?: string })._id) === String(ctx.user?._id);
                    })();
                    const initial = typeof author === 'object' && author ? ((author.displayName || author.username || 'U')[0] || 'U').toUpperCase() : (activity.user[0] || 'U').toUpperCase();

                    return (
                      <div key={activity.id} className="flex gap-2">
                        <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {author && typeof author === 'object' && (author as { avatarUrl?: string }).avatarUrl ? <img src={(author as { avatarUrl?: string }).avatarUrl} alt={activity.user} className="w-full h-full object-cover rounded-full" /> : initial}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{activity.user}</span>
                              {isAuthor && <button onClick={() => ctx.handleDeleteComment(card._id, cm._id)} className="text-xs text-red-600 hover:text-red-700">Xóa</button>}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{activity.text}</div>
                          </div>
                          {timeAgo && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1" title={fullDateTime}>{timeAgo}</div>}
                        </div>
                      </div>
                    );
                  }

                  // Activity thông thường
                  return (
                    <div key={activity.id} className="flex gap-2">
                      <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {activity.userData?.avatarUrl ? (
                          <img src={activity.userData.avatarUrl} alt={activity.user} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          (activity.user[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">{activity.user}</span> {activity.text}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1" title={fullDateTime}>{timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Menu Popup */}
      {showMemberMenu && (
        <div className="fixed inset-0 bg-black/20 z-60 flex items-center justify-center" onClick={() => { setShowMemberMenu(false); setMemberSearchText(''); }}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('board.members')}</h3>
              <button onClick={() => { setShowMemberMenu(false); setMemberSearchText(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <input 
              type="text" 
              placeholder={t('member.searchMembers')} 
              value={memberSearchText}
              onChange={(e) => setMemberSearchText(e.target.value)}
              className="w-full px-3 py-2 mb-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
            
            {/* Card members section */}
            {card.members && card.members.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('member.cardMembers')}</h4>
                <div className="space-y-1">
                  {card.members.map((member) => {
                    const memberId = typeof member === 'string' ? member : (member as { _id?: string })._id;
                    const memberName = typeof member === 'string' 
                      ? 'Thành viên' 
                      : ((member as { displayName?: string; username?: string }).displayName || (member as { displayName?: string; username?: string }).username || 'Thành viên');
                    const memberAvatar = typeof member === 'object' && member ? (member as { avatarUrl?: string }).avatarUrl : undefined;
                    const initial = memberName[0]?.toUpperCase() || 'U';

                    return (
                      <div key={String(memberId)} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 group">
                        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {memberAvatar ? (
                            <img src={memberAvatar} alt={memberName} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            initial
                          )}
                        </div>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{memberName}</span>
                        <button 
                          onClick={() => { if (card._id && memberId) handleRemoveMemberWithActivity(String(card._id), String(memberId)); }} 
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          aria-label="Xóa"
                        >
                          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search results or Board members section */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {memberSearchText.trim().length >= 2 ? t('member.searchMembers').replace('...', '') : t('member.boardMembers')}
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searchingUsers ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('common.loading')}</div>
                ) : memberSearchText.trim().length >= 2 ? (
                  searchedUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('member.noMembers')}</div>
                  ) : (
                    searchedUsers.map((user) => {
                      const already = (card.members || []).some((cm) => {
                        if (!cm) return false;
                        if (typeof cm === 'string') return String(cm) === String(user._id);
                        return String((cm as { _id?: string })._id) === String(user._id);
                      });
                      const initial = (user.displayName || user.username)[0]?.toUpperCase() || 'U';
                      
                      return (
                        <div key={user._id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { if (!already && card._id) handleAddMemberWithActivity(String(card._id), user._id); }}>
                          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              initial
                            )}
                          </div>
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{user.displayName || user.username}</span>
                          {already && <span className="text-xs text-gray-500">✓</span>}
                        </div>
                      );
                    })
                  )
                ) : (
                  (ctx.board?.members || []).map((m) => {
                    type MType = string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string };
                    const member = m as MType;
                    const id = typeof member === 'string' ? member : member._id;
                    const name = typeof member === 'string' ? String(member) : (member.displayName || member.username || 'Người dùng');
                    const avatar = typeof member === 'object' && member ? member.avatarUrl : undefined;
                    const initial = name[0]?.toUpperCase() || 'U';
                    const already = (card.members || []).some((cm) => {
                      if (!cm) return false;
                      if (typeof cm === 'string') return String(cm) === String(id);
                      return String((cm as { _id?: string })._id) === String(id);
                    });
                    
                    return (
                      <div key={String(id)} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { if (!already && card._id && id) handleAddMemberWithActivity(String(card._id), String(id)); }}>
                        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            initial
                          )}
                        </div>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{name}</span>
                        {already && <span className="text-xs text-gray-500">✓</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Label Menu Popup */}
      {showLabelMenu && (
        <div className="fixed inset-0 bg-black/20 z-60 flex items-center justify-center" onClick={() => { setShowLabelMenu(false); setLabelSearchText(''); }}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-80 shadow-xl max-h-[600px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('board.labels')}</h3>
              <button onClick={() => { setShowLabelMenu(false); setLabelSearchText(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Search labels */}
            <input 
              type="text" 
              placeholder={t('label.searchLabels')} 
              value={labelSearchText}
              onChange={(e) => setLabelSearchText(e.target.value)}
              className="w-full px-3 py-2 mb-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />

            {/* Existing labels with checkboxes */}
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('board.labels')}</h4>
              <div className="space-y-1">
                {(() => {
                  // Lấy tất cả labels từ tất cả cards trong board
                  const allLabelsMap = new Map<string, { color: string; name: string; _id?: string }>();
                  ctx.cards.forEach((c) => {
                    c.labels?.forEach((label) => {
                      const key = `${label.color}-${label.name}`;
                      if (!allLabelsMap.has(key)) {
                        allLabelsMap.set(key, label);
                      }
                    });
                  });
                  const allLabels = Array.from(allLabelsMap.values());

                  // Filter labels based on search text
                  const filteredLabels = allLabels.filter((label) => 
                    label.name.toLowerCase().includes(labelSearchText.toLowerCase())
                  );

                  if (filteredLabels.length === 0) {
                    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('label.noLabels')}</div>;
                  }

                  return filteredLabels.map((label) => {
                    const isChecked = card?.labels?.some(l => l.color === label.color && l.name === label.name) || false;
                    const currentLabel = card?.labels?.find(l => l.color === label.color && l.name === label.name);
                    const labelId = currentLabel?._id || label._id || `${label.color}-${label.name}`;
                    
                    return (
                      <div key={labelId} className="flex items-center gap-2 group">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked && currentLabel) {
                              handleRemoveLabelWithActivity(String(card._id), labelId);
                            } else {
                              handleAddLabelWithActivity(String(card._id), label.color, label.name);
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <div 
                          className="flex-1 px-3 py-2 rounded text-sm font-medium text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: label.color }}
                          onClick={() => {
                            if (isChecked && currentLabel) {
                              handleRemoveLabelWithActivity(String(card._id), labelId);
                            } else {
                              handleAddLabelWithActivity(String(card._id), label.color, label.name);
                            }
                          }}
                        >
                          {label.name}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLabelColorLocal(label.color);
                            setNewLabelTextLocal(label.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          title="Chỉnh sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Create new label */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('label.createLabel')}</h4>
              <div className="flex gap-2 mb-3">
                <input 
                  value={newLabelTextLocal} 
                  onChange={(e) => setNewLabelTextLocal(e.target.value)} 
                  placeholder={t('label.labelName')} 
                  className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('label.labelColor')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {labelColors.map((lc) => (
                    <button 
                      key={lc.value} 
                      onClick={() => setSelectedLabelColorLocal(lc.value)} 
                      className={`w-full aspect-square rounded border-2 hover:scale-110 transition-transform ${selectedLabelColorLocal === lc.value ? 'ring-2 ring-blue-500 scale-110' : 'border-gray-200 dark:border-gray-700'}`} 
                      style={{ backgroundColor: lc.value }} 
                      aria-label={lc.name} 
                      title={lc.name} 
                    />
                  ))}
                </div>
              </div>
              <button 
                className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm" 
                onClick={() => {
                  if (!newLabelTextLocal.trim()) return;
                  if (card._id) {
                    handleAddLabelWithActivity(String(card._id), selectedLabelColorLocal, newLabelTextLocal.trim());
                    setNewLabelTextLocal('');
                  }
                }}
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Due Date Editor */}
      {showDueEditor && (
        <div className="fixed inset-0 bg-black/20 z-60 flex items-center justify-center" onClick={() => setShowDueEditor(false)}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Chọn ngày & giờ</label>
            <input type="datetime-local" value={dueDateLocal} onChange={(e) => setDueDateLocal(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm mb-3" />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setShowDueEditor(false); setDueDateLocal(isoToLocalInput((card as CardItem).dueDate)); }}>Hủy</button>
              <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700" onClick={async () => {
                const iso = dueDateLocal ? new Date(dueDateLocal).toISOString() : null;
                try {
                  const boardId = ctx.board?._id;
                  const listId = card.listId;
                  if (boardId && listId) {
                    await cardService.update(String(boardId), String(listId), String(card._id), { dueDate: iso });
                    (card as CardItem).dueDate = iso;
                    toast.success(iso ? 'Đã cập nhật hạn' : 'Đã xóa hạn');
                    setShowDueEditor(false);
                    setRerender((r) => r + 1);
                  }
                } catch (err) {
                  console.error('update dueDate error', err);
                  toast.error('Cập nhật hạn thất bại');
                }
              }}>Lưu</button>
              {(card as CardItem).dueDate && (
                <button className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700" onClick={async () => {
                  try {
                    const boardId = ctx.board?._id;
                    const listId = card.listId;
                    if (boardId && listId) {
                      await cardService.update(String(boardId), String(listId), String(card._id), { dueDate: null });
                      (card as CardItem).dueDate = null;
                      toast.success('Đã xóa hạn');
                      setDueDateLocal('');
                      setShowDueEditor(false);
                      setRerender((r) => r + 1);
                    }
                  } catch (err) {
                    console.error('remove dueDate error', err);
                    toast.error('Xóa hạn thất bại');
                  }
                }}>Xóa</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
