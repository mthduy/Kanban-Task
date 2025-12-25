import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Star, Users, Grid3x3, Calendar, Filter, X, Clock, Tag, User, Pencil, MessageSquare, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import '@/styles/read-only-mode.css';
import BackgroundPicker from '@/components/board/BackgroundPicker';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import CardModal from './CardModal';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { boardService } from '@/services/boardService';
import { listService } from '@/services/listService';
import { cardService } from '@/services/cardService';
import type { CardFilterOptions } from '@/services/cardService';
import type { Board, ListItem, CardItem } from '@/types/board';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import socketService from '@/lib/socket';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';
import { formatDueDate, isOverdue, formatFullDateTime } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable List Item Component
interface SortableListProps {
  list: ListItem;
  index: number;
  children: React.ReactNode;
}

function SortableList({ list, children }: SortableListProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(list._id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Filter listeners to exclude elements with data-no-drag
  const filteredListeners = listeners ? Object.keys(listeners).reduce((acc, key) => {
    const originalHandler = listeners[key as keyof typeof listeners];
    acc[key as keyof typeof listeners] = (e: Event) => {
      let target = e.target as HTMLElement;
      while (target && target !== e.currentTarget) {
        if (target.getAttribute?.('data-no-drag') === 'true') {
          return; // Don't trigger drag for elements with data-no-drag
        }
        target = target.parentElement as HTMLElement;
      }
      if (originalHandler) originalHandler(e);
    };
    return acc;
  }, {} as typeof listeners) : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...filteredListeners}>
      {children}
    </div>
  );
}

// Sortable Card Item Component
interface SortableCardProps {
  card: CardItem;
  children: React.ReactNode;
}

function SortableCard({ card, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(card._id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// Droppable List Container
interface DroppableListProps {
  listId: string;
  children: React.ReactNode;
}

function DroppableList({ listId, children }: DroppableListProps) {
  const { setNodeRef } = useDroppable({ id: listId });
  
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-1">
      {children}
    </div>
  );
}

// helper to format relative time in Vietnamese (used for card createdAt)
function timeAgo(dateStr?: string) {
  if (!dateStr) 
    return '';
  const then = new Date(dateStr).getTime(); //parse milliseconds
  //parse fail
  if (isNaN(then)) 
    return '';
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000); // seconds
  if (diff < 10) 
    return 'vừa xong';
  if (diff < 60) 
    return `${diff} giây trước`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) 
    return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) 
    return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) 
    return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) 
    return `${months} tháng trước`;
  const years = Math.floor(months / 12);
    return `${years} năm trước`;
}

const BoardPage = () => {
  const params = useParams();
  const id = params.id;
  const cardIdParam = params.cardId;
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [allCards, setAllCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const user = useAuthStore((s) => s.user); //get user from store
  const navigate = useNavigate(); //hook to navigate programmatically
  const [showUserPreview, setShowUserPreview] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const creatingRef = useRef(false); // ban multiple create list submissions
  // UI states for edit/delete and card composer
  const [openListMenu, setOpenListMenu] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState('');
  const [showEditList, setShowEditList] = useState(false);
  // inline list title editing
  const [inlineEditingListId, setInlineEditingListId] = useState<string | null>(null);
  const [inlineListTitle, setInlineListTitle] = useState('');
  
  // inline board title editing
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [inlineBoardTitle, setInlineBoardTitle] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardListId, setAddCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState('');
  const [editCardDesc, setEditCardDesc] = useState('');
  const [showEditCard, setShowEditCard] = useState(false);
  const [openCardMenu, setOpenCardMenu] = useState<string | null>(null);
  


  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  
  // Delete list confirmation modal
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [moveCardsTargetList, setMoveCardsTargetList] = useState<string | null>(null);
  const [showMoveCardsOption, setShowMoveCardsOption] = useState(false);

  // Remove member confirmation modal
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  type MemberRef = string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string } | null;
  const [memberToRemove, setMemberToRemove] = useState<MemberRef>(null);
  
  // Background picker state
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  
  // Filter state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'none' | 'completed' | 'incomplete'>('none');
  const [filterTime, setFilterTime] = useState<'none' | 'today' | 'week' | 'month'>('none');
  const [filterMembers, setFilterMembers] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<Array<{ color: string; name: string }>>([]);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [filterMenuPos, setFilterMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Whether user explicitly enabled any filter (no default filtering)
  const isFilterEnabled = useMemo(() => (
    filterStatus !== 'none' || filterTime !== 'none' || filterMembers.length > 0 || filterLabels.length > 0
  ), [filterStatus, filterTime, filterMembers, filterLabels]);

  // Helper: upsert card vào cả `allCards` và `cards`, và nếu có filter đang bật thì reset filter (đảm bảo card hiển thị)
  const upsertCardLocal = useCallback((card: CardItem) => {
    setAllCards((s) => {
      const exists = s.some((c) => String(c._id) === String(card._id));
      if (exists) return s.map((c) => (String(c._id) === String(card._id) ? card : c));
      return [...s, card];
    });
    setCards((s) => {
      const exists = s.some((c) => String(c._id) === String(card._id));
      if (exists) return s.map((c) => (String(c._id) === String(card._id) ? card : c));
      return [...s, card];
    });
    if (isFilterEnabled) {
      setFilterStatus('none');
      setFilterTime('none');
      setFilterMembers([]);
      setFilterLabels([]);
    }
  }, [isFilterEnabled]);

  // Drag and Drop state
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  // DnD sensors - disabled for viewer role
  const isViewer = userRole === 'viewer';
  const canEdit = userRole === 'editor' || userRole === 'owner';
  const isOwner = userRole === 'owner';
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isViewer ? 999999 : 8, // Effectively disable drag for viewers
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    
    // Check if dragging a list
    if (lists.some(l => String(l._id) === activeId)) {
      setActiveListId(activeId);
    }
  };

  const handleDragOver = () => {
    // Just for collision detection, no state needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveListId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle list reordering
    if (lists.some(l => String(l._id) === activeId) && lists.some(l => String(l._id) === overId)) {
      setLists((items) => {
        const oldIndex = items.findIndex((item) => String(item._id) === activeId);
        const newIndex = items.findIndex((item) => String(item._id) === overId);

        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }

        return arrayMove(items, oldIndex, newIndex);
      });

      toast.success('Đã thay đổi thứ tự danh sách');
      return;
    }

    // Handle card movement
    const activeCard = allCards.find(c => String(c._id) === activeId);
    if (!activeCard) return;

    // Determine target list ID and position
    // overId can be a list ID (DroppableList) or another card ID
    let targetListId: string | null = null;
    let targetCardId: string | null = null;
    
    // Check if over is a list (droppable area)
    const targetList = lists.find(l => String(l._id) === overId);
    if (targetList) {
      targetListId = String(targetList._id);
    } else {
      // Check if over is a card, get its list
      const overCard = allCards.find(c => String(c._id) === overId);
      if (overCard) {
        targetListId = String(overCard.listId);
        targetCardId = String(overCard._id);
      }
    }

    if (!targetListId) return;

    const sourceListId = String(activeCard.listId);

    // Case 1: Moving card to a different list
    if (sourceListId !== targetListId) {
      handleMoveCard(activeId, targetListId);
      return;
    }

    // Case 2: Reordering within same list
    if (sourceListId === targetListId && targetCardId) {
      setCards((items) => {
        // Only reorder cards in the same list
        const listCards = items.filter(c => String(c.listId) === sourceListId);
        const otherCards = items.filter(c => String(c.listId) !== sourceListId);
        
        const oldIndex = listCards.findIndex(c => String(c._id) === activeId);
        const newIndex = listCards.findIndex(c => String(c._id) === targetCardId);
        
        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }
        
        const reordered = arrayMove(listCards, oldIndex, newIndex);
        return [...otherCards, ...reordered];
      });
      
      setAllCards((items) => {
        const listCards = items.filter(c => String(c.listId) === sourceListId);
        const otherCards = items.filter(c => String(c.listId) !== sourceListId);
        
        const oldIndex = listCards.findIndex(c => String(c._id) === activeId);
        const newIndex = listCards.findIndex(c => String(c._id) === targetCardId);
        
        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }
        
        const reordered = arrayMove(listCards, oldIndex, newIndex);
        return [...otherCards, ...reordered];
      });
      
      toast.success('Đã thay đổi vị trí thẻ');
    }
  };

  const openFilterMenuAtButton = useCallback(() => {
    const btn = filterRef.current?.querySelector('button');
    if (!btn) {
      setFilterMenuPos({ top: 56, left: 16 });
      setShowFilterMenu(true);
      return;
    }
    const rect = (btn as HTMLElement).getBoundingClientRect();
    const dropdownWidth = 224; // w-56
    const left = Math.max(8, rect.right - dropdownWidth);
    const top = rect.bottom + 8;
    setFilterMenuPos({ top, left });
    setShowFilterMenu(true);
  }, []);

  // Share modal state (includes invite + member management)
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // // Label management state
  const [, setNewLabelText] = useState('');
  const selectedLabelColor = '#3b82f6';

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  

  const ensureOwnerInMembers = useCallback((b: Partial<Board> | null): Board | null => {
    if (!b) 
      return null;
    try {
      const ownerObj = b.owner && typeof b.owner === 'object'
        ? (b.owner as { _id?: string; displayName?: string; username?: string; avatarUrl?: string })
        : null;
      const members = Array.isArray(b.members)
        ? (b.members.slice() as Array<string | { _id?: string; displayName?: string; username?: string; avatarUrl?: string }>)
        : [];

        //check owner in members
      if (ownerObj && !members.some((m: string | { _id?: string }) => {
        const mid = typeof m === 'string' ? m : m._id;
        return String(mid) === String(ownerObj._id || ownerObj);
      })) {
        //push owner head
        members.unshift(ownerObj);
      }
      return { ...(b as Board), members };
    } catch (err) {
      console.error('ensureOwnerInMembers error', err);
      return (b as Board) || null;
    }
  }, []);

  const createLocalList = async (e?: React.FormEvent) => {
    //prevent form submission
    e?.preventDefault();
    //prevent double submit
    if (creatingRef.current) 
      return;
    if (!newListTitle.trim() || (newListTitle.trim().length < 2)) {
      toast.error('Tiêu đề danh sách phải có ít nhất 2 ký tự');
      return;
    }
    try {
      // Set creating flag
      creatingRef.current = true;
      // If board exists on server, persist the list; otherwise fallback to local temp list
      if (board && board._id) {
        const result = await listService.create(String(board._id), newListTitle.trim());
        if (result.list) {
          setLists((s) => [
            ...s.filter((x) => String(x._id) !== String(result.list._id)), //prevent duplicate lists
            result.list, //append in the end
          ]);
          toast.success(result.message || 'Tạo danh sách thành công');
        }
        //if no board._id
      } else { //if no board._id
        // Create a temporary id for the list
        const id = `temp-${Date.now()}`;
        //use board._id temporary as boardId
        const boardId = board?._id || String(id);
        //create list object 
        const list = { _id: id, title: newListTitle.trim(), boardId, createdAt: new Date().toISOString() } as unknown as ListItem;
        setLists((s) => [
          //filter out any existing list with same id (should not happen)
          ...s.filter((x) => String(x._id) !== String(list._id)),
          list,
        ]);
        toast.success('Tạo danh sách thành công');
      }
      setNewListTitle(''); //reset new list title
      setShowCreateList(false); //close create list UI
    } catch (err) {
      console.error('create local list error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tạo danh sách thất bại';
      toast.error(errorMsg);
    } finally {
      creatingRef.current = false;
    }
  };

  // Edit list
  const handleEditListSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingListId) // list id to edit 
      return;
    try {
      // If board persisted, call API; otherwise update local list
      if (board && board._id) {
        const result = await listService.update(String(board._id), editingListId, { title: editListTitle });
        setLists((s) => s.map((l) => (String(l._id) === String(result.list._id) ? result.list : l)));
        toast.success(result.message);
      } else {
        setLists((s) => s.map((l) => (String(l._id) === String(editingListId) ? { ...l, title: editListTitle } : l)));
        toast.success('Cập nhật danh sách thành công');
      }
      setShowEditList(false);
      setEditingListId(null);
      setEditListTitle('');
    } catch (err) {
      console.error('update list error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật danh sách thất bại';
      toast.error(errorMsg);
    }
  };

  // Inline list title edit commit
  const commitInlineListTitle = async (listId: string) => {
    const title = inlineListTitle.trim();
    if (!title || title.length < 2) {
      toast.error('Tiêu đề danh sách phải có ít nhất 2 ký tự');
      setInlineListTitle('');
      setInlineEditingListId(null);
      return;
    }
    try {
      if (board && board._id) {
        const result = await listService.update(String(board._id), listId, { title });
        setLists((s) => s.map((l) => (String(l._id) === String(result.list._id) ? result.list : l)));
        toast.success(result.message || 'Cập nhật danh sách thành công');
      } else {
        setLists((s) => s.map((l) => (String(l._id) === String(listId) ? { ...l, title } as ListItem : l)));
        toast.success('Cập nhật danh sách thành công');
      }
    } catch (err) {
      console.error('inline update list error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật danh sách thất bại';
      toast.error(errorMsg);
    } finally {
      setInlineEditingListId(null);
      setInlineListTitle('');
    }
  };

  // Inline board title edit commit
  const commitInlineBoardTitle = async () => {
    const title = inlineBoardTitle.trim();
    if (!title || title.length < 2) {
      toast.error('Tiêu đề board phải có ít nhất 2 ký tự');
      setInlineBoardTitle('');
      setIsEditingBoardTitle(false);
      return;
    }
    try {
      if (board && board._id) {
        const result = await boardService.update(String(board._id), { title });
        setBoard({ ...board, title: result.title });
        toast.success('Cập nhật board thành công');
      } else {
        setBoard((b) => (b ? { ...b, title } : null));
        toast.success('Cập nhật board thành công');
      }
    } catch (err) {
      console.error('inline update board error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật board thất bại';
      toast.error(errorMsg);
    } finally {
      setIsEditingBoardTitle(false);
      setInlineBoardTitle('');
    }
  };

  // Add card
  const handleAddCardSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!addCardListId) 
      return;
    try {
      const position = cards.filter((c) => String(c.listId) === String(addCardListId)).length;
      if (board && board._id) {
        const result = await cardService.create(String(board._id), addCardListId, newCardTitle.trim(), position, newCardDesc.trim());
        setCards((s) => [...s, result.card]);
        setAllCards((s) => [...s, result.card]);
        toast.success(result.message);
      } else {
        const id = `temp-card-${Date.now()}`;
        const tempCard: CardItem = {
          _id: id,
          title: newCardTitle.trim(),
          description: newCardDesc.trim(),
          listId: addCardListId,
          boardId: board?._id || String(id),
          position,
          createdAt: new Date().toISOString(),
        } as CardItem;
        setCards((s) => [...s, tempCard]);
        setAllCards((s) => [...s, tempCard]);
        toast.success('Tạo thẻ thành công');
      }
      setNewCardTitle('');
      setNewCardDesc('');
      setShowAddCard(false);
      setAddCardListId(null);
    } catch (err) {
      console.error('create card error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tạo thẻ thất bại';
      toast.error(errorMsg);
    }
  };

  // Edit card
  const handleEditCardSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingCardId) return;
    try {
      const card = allCards.find((c) => String(c._id) === String(editingCardId));
      const listId = card?.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), editingCardId, { title: editCardTitle, description: editCardDesc });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success(result.message);
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(editingCardId) ? { ...c, title: editCardTitle, description: editCardDesc } : c)));
        setCards((s) => {
          const exists = s.some((c) => String(c._id) === String(editingCardId));
          if (exists) return s.map((c) => (String(c._id) === String(editingCardId) ? { ...c, title: editCardTitle, description: editCardDesc } : c));
          return [...s, { ...(allCards.find(c => String(c._id) === String(editingCardId)) || {} as CardItem), title: editCardTitle, description: editCardDesc } as CardItem];
        });
        toast.success('Cập nhật thẻ thành công');
      }
      setShowEditCard(false);
      setEditingCardId(null);
      setEditCardTitle('');
      setEditCardDesc('');
    } catch (err) {
      console.error('update card error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật thẻ thất bại';
      toast.error(errorMsg);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    try {
      const targetCard = allCards.find((c) => String(c._id) === String(deleteCardId));
      const listId = targetCard?.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.remove(String(board._id), String(listId), deleteCardId);
        setCards((s) => s.filter((c) => String(c._id) !== String(deleteCardId)));
        setAllCards((s) => s.filter((c) => String(c._id) !== String(deleteCardId)));
        toast.success(result.message);
      } else {
        setCards((s) => s.filter((c) => String(c._id) !== String(deleteCardId)));
        setAllCards((s) => s.filter((c) => String(c._id) !== String(deleteCardId)));
        toast.success('Xóa thẻ thành công');
      }
      setShowEditCard(false);
      setEditingCardId(null);
      setShowDeleteConfirm(false);
      setDeleteCardId(null);
    } catch (err) {
      console.error('delete card error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thẻ thất bại';
      toast.error(errorMsg);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListId) return;
    
    // Move cards to target list if specified
    if (moveCardsTargetList) {
      const cardsToMove = cards.filter((c) => String(c.listId) === String(deleteListId));
      try {
        // Move each card to the target list
        for (const card of cardsToMove) {
          await handleMoveCard(String(card._id), moveCardsTargetList);
        }
        toast.success(`Đã di chuyển ${cardsToMove.length} thẻ sang danh sách khác`);
      } catch (err) {
        console.error('move cards error', err);
        toast.error('Có lỗi khi di chuyển thẻ');
        return;
      }
    }
    
    try {
      if (board && board._id) {
        const result = await listService.remove(String(board._id), deleteListId);
        setLists((s) => s.filter((l) => String(l._id) !== String(deleteListId)));
        if (!moveCardsTargetList) {
          setCards((s) => s.filter((c) => String(c.listId) !== String(deleteListId)));
          setAllCards((s) => s.filter((c) => String(c.listId) !== String(deleteListId)));
        }
        toast.success(result.message);
      } else {
        setLists((s) => s.filter((l) => String(l._id) !== String(deleteListId)));
        if (!moveCardsTargetList) {
          setCards((s) => s.filter((c) => String(c.listId) !== String(deleteListId)));
          setAllCards((s) => s.filter((c) => String(c.listId) !== String(deleteListId)));
        }
        toast.success('Xóa danh sách thành công');
      }
      setShowDeleteListConfirm(false);
      setDeleteListId(null);
      setMoveCardsTargetList(null);
      setShowMoveCardsOption(false);
    } catch (err) {
      console.error('delete list error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa danh sách thất bại';
      toast.error(errorMsg);
    }
  };

  const handleInviteMember = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    if (inviting) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Email không hợp lệ');
      return;
    }

    try {
      setInviting(true);
      await boardService.inviteMember(id, inviteEmail.trim());
      // refresh board to reflect any immediate changes
      const data = await boardService.get(id);
      setBoard(ensureOwnerInMembers(data.board as unknown as Partial<Board>));
      setInviteEmail('');
      toast.success('Đã mời thành viên thành công!');
    } catch (err) {
      console.error('invite member error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Mời thành viên thất bại';
      toast.error(errorMsg);
    } finally {
      setInviting(false);
    }
  };

  const handleToggleComplete = async (cardId: string, currentStatus: boolean) => {
    try {
      const card = allCards.find((c) => String(c._id) === String(cardId));
      const listId = card?.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), cardId, { completed: !currentStatus });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success(result.message);
      } else {
        // Build updated card deterministically from current sources to avoid stale closures
        const prev = allCards.find(c => String(c._id) === String(cardId)) || cards.find(c => String(c._id) === String(cardId)) || null;
        const newCard = ({ ...(prev || { _id: cardId }), completed: !currentStatus } as CardItem);

        setAllCards((s) => {
          const exists = s.some((c) => String(c._id) === String(cardId));
          if (exists) return s.map((c) => (String(c._id) === String(cardId) ? newCard : c));
          return [...s, newCard];
        });

        upsertCardLocal(newCard);

        toast.success('Cập nhật trạng thái thành công');
      }
    } catch (err) {
      console.error('toggle complete error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật trạng thái thất bại';
      toast.error(errorMsg);
    }
  };

  const handleAddMember = async (cardId: string, memberId: string) => {
    try {
      const card = allCards.find((c) => String(c._id) === String(cardId));
      if (!card) return;
      
      const currentMembers = card.members || [];
      const memberIds = currentMembers.map((m) => typeof m === 'string' ? m : m._id).filter(Boolean) as string[];
      
      if (memberIds.includes(memberId)) {
        toast.info('Thành viên đã có trong thẻ');
        return;
      }

      const updatedMembers = [...memberIds, memberId];
      const listId = card.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), cardId, { members: updatedMembers });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success('Đã thêm thành viên vào thẻ');
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, members: updatedMembers } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, members: updatedMembers } as CardItem;
          upsertCardLocal(newCard);
        }
        toast.success('Đã thêm thành viên vào thẻ');
      }
    } catch (err) {
      console.error('add member error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thêm thành viên thất bại';
      toast.error(errorMsg);
    }
  };

  const handleRemoveMember = async (cardId: string, memberId: string) => {
    try {
      const card = allCards.find((c) => String(c._id) === String(cardId));
      if (!card) return;
      
      const currentMembers = card.members || [];
      const memberIds = currentMembers.map((m) => typeof m === 'string' ? m : m._id).filter(Boolean) as string[];
      
      const updatedMembers = memberIds.filter((id) => String(id) !== String(memberId));
      const listId = card.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), cardId, { members: updatedMembers });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success('Đã xóa thành viên khỏi thẻ');
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, members: updatedMembers } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, members: updatedMembers } as CardItem;
          upsertCardLocal(newCard);
        }
        toast.success('Đã xóa thành viên khỏi thẻ');
      }
    } catch (err) {
      console.error('remove member error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thành viên thất bại';
      toast.error(errorMsg);
    }
  };

  // Update board background
  const handleUpdateBackground = async (background: string) => {
    try {
      if (!board?._id) return;
      
      const updatedBoard = await boardService.updateBackground(board._id, background);
      setBoard(updatedBoard);
      setShowBackgroundPicker(false);
      toast.success('Đã cập nhật background');
    } catch (error) {
      console.error('Update background error:', error);
      toast.error('Cập nhật background thất bại');
    }
  };

  // Move card between lists (drag & drop)
  const handleMoveCard = async (cardId: string, targetListId: string) => {
    try {
      const card = allCards.find((c) => String(c._id) === String(cardId));
      if (!card) return;
      const sourceListId = String(card.listId || '');
      if (!targetListId || sourceListId === String(targetListId)) return;

      if (board && board._id && sourceListId) {
        // Call API using source list id in URL and target list id in payload
        const result = await cardService.update(String(board._id), sourceListId, cardId, { listId: targetListId });
        
        // Emit socket event for real-time updates
        socketService.emitCardMoved(String(board._id), cardId, sourceListId, targetListId);
        
        // Refetch the board to get server-authoritative ordering (cards are sorted by createdAt server-side)
        try {
          const data = await boardService.get(String(board._id));
          setBoard(ensureOwnerInMembers(data.board as unknown as Partial<Board>));
          setLists((data.lists || []) as ListItem[]);
          const fullCards = (data.cards || []) as CardItem[];
          setCards(fullCards);
          setAllCards(fullCards);
        } catch {
          // Fallback: update local cards keeping ordering by createdAt
          setCards((s) => {
            const others = s.filter((c) => String(c._id) !== String(result.card._id));
            const merged = [...others, result.card];
            merged.sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
            return merged;
          });
          setAllCards((s) => {
            const others = s.filter((c) => String(c._id) !== String(result.card._id));
            const merged = [...others, result.card];
            merged.sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
            return merged;
          });
        }
        toast.success(result.message || 'Di chuyển thẻ thành công');
      } else {
        // Local-only board: update card listId and keep sort by createdAt
        setCards((s) => {
          const updated = s.map((c) => (String(c._id) === String(cardId) ? { ...c, listId: targetListId } : c));
          updated.sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
          return updated;
        });
        setAllCards((s) => {
          const updated = s.map((c) => (String(c._id) === String(cardId) ? { ...c, listId: targetListId } : c));
          updated.sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
          return updated;
        });
        toast.success('Di chuyển thẻ thành công');
      }
    } catch (err) {
      console.error('move card error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Di chuyển thẻ thất bại';
      toast.error(errorMsg);
    }
  };

  const handleAddLabel = async (cardId: string, labelText: string) => {
    try {
      // Parse labelText - có thể là JSON string hoặc "color:name" format
      let newLabel: { color: string; name: string };
      
      try {
        // Thử parse JSON trước
        newLabel = JSON.parse(labelText);
      } catch {
        // Fallback: parse "color:name" format
        const idx = labelText.indexOf(':');
        if (idx !== -1) {
          newLabel = {
            color: labelText.slice(0, idx),
            name: labelText.slice(idx + 1).trim()
          };
        } else {
          // Nếu không có format, dùng color mặc định
          newLabel = {
            color: selectedLabelColor,
            name: labelText.trim()
          };
        }
      }

      if (!newLabel.name.trim()) {
        toast.error('Vui lòng nhập tên nhãn');
        return;
      }

      const card = allCards.find((c) => String(c._id) === String(cardId));
      if (!card) return;

      const currentLabels = card.labels || [];
      
      // Check trùng lặp
      if (currentLabels.some(l => l.color === newLabel.color && l.name === newLabel.name)) {
        toast.info('Nhãn này đã tồn tại');
        return;
      }

      const updatedLabels = [...currentLabels, newLabel];
      const listId = card.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), cardId, { labels: updatedLabels });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        setNewLabelText('');
        toast.success('Đã thêm nhãn');
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, labels: updatedLabels } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, labels: updatedLabels } as CardItem;
          upsertCardLocal(newCard);
        }
        setNewLabelText('');
        toast.success('Đã thêm nhãn');
      }
    } catch (err) {
      console.error('add label error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thêm nhãn thất bại';
      toast.error(errorMsg);
    }
  };

  const handleRemoveLabel = async (cardId: string, label: string) => {
    try {
      const card = allCards.find((c) => String(c._id) === String(cardId));
      if (!card) return;
      
      const currentLabels = card.labels || [];
      // label có thể là _id hoặc "color-name" composite key
      const updatedLabels = currentLabels.filter((l) => {
        const labelId = l._id || `${l.color}-${l.name}`;
        return labelId !== label;
      });
      
      const listId = card.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.update(String(board._id), String(listId), cardId, { labels: updatedLabels });
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success('Đã xóa nhãn');
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, labels: updatedLabels } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, labels: updatedLabels } as CardItem;
          upsertCardLocal(newCard);
        }
        toast.success('Đã xóa nhãn');
      }
    } catch (err) {
      console.error('remove label error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa nhãn thất bại';
      toast.error(errorMsg);
    }
  };

  // Comments
  const handlePostComment = async (cardId: string) => {
    try {
      if (!cardId) return;
      if (!commentText.trim()) {
        toast.error('Vui lòng nhập bình luận');
        return;
      }
      setPostingComment(true);
      const card = allCards.find((c) => String(c._id) === String(cardId));
      const listId = card?.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.postComment(String(board._id), String(listId), cardId, commentText.trim());
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        setCommentText('');
        toast.success(result.message || 'Đã thêm bình luận');
      } else {
        const newComment = { _id: `temp-cmt-${Date.now()}`, text: commentText.trim(), author: user?._id, createdAt: new Date().toISOString() };
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, comments: [...(c.comments || []), newComment] } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, comments: [...(updated.comments || []), newComment] } as CardItem;
          upsertCardLocal(newCard);
        }
        setCommentText('');
        toast.success('Đã thêm bình luận');
      }
    } catch (err) {
      console.error('post comment error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thêm bình luận thất bại';
      toast.error(errorMsg);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (cardId: string, commentId: string) => {
    try {
      if (!cardId || !commentId) return;
      const card = allCards.find((c) => String(c._id) === String(cardId));
      const listId = card?.listId || null;
      if (board && board._id && listId) {
        const result = await cardService.deleteComment(String(board._id), String(listId), cardId, commentId);
        setAllCards((s) => s.map((c) => (String(c._id) === String(result.card._id) ? result.card : c)));
        upsertCardLocal(result.card);
        toast.success(result.message || 'Đã xóa bình luận');
      } else {
        setAllCards((s) => s.map((c) => (String(c._id) === String(cardId) ? { ...c, comments: (c.comments || []).filter((cm) => String(cm._id) !== String(commentId)) } : c)));
        {
          const updated = (allCards.find(c => String(c._id) === String(cardId)) || (cards.find(c => String(c._id) === String(cardId)) || {})) as CardItem;
          const newCard = { ...updated, comments: (updated.comments || []).filter((cm) => String(cm._id) !== String(commentId)) } as CardItem;
          upsertCardLocal(newCard);
        }
        toast.success('Đã xóa bình luận');
      }
    } catch (err) {
      console.error('delete comment error', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa bình luận thất bại';
      toast.error(errorMsg);
    }
  };

  // Parse label - giữ lại để tương thích, nhưng bây giờ chỉ xử lý object
  const parseLabel = (label: string | { color: string; name: string }) => {
    // Nếu là object mới
    if (typeof label === 'object' && label !== null) {
      return { color: label.color, text: label.name };
    }
    // Fallback cho format cũ (nếu còn)
    if (typeof label === 'string') {
      const idx = label.indexOf(':');
      if (idx !== -1) {
        const color = label.slice(0, idx);
        const text = label.slice(idx + 1);
        return { color, text };
      }
      return { color: '#6b7280', text: label };
    }
    return { color: '#6b7280', text: 'Unknown' };
  };

  // Server-side filtering: refetch cards when UI filters change
  useEffect(() => {
    const fetchFiltered = async () => {
      if (!id || !board?._id) return;
      // Only run when user explicitly enabled any filter
      if (!isFilterEnabled) return;
      try {
        const opts: CardFilterOptions = {};
        if (filterStatus !== 'none') opts.completed = filterStatus === 'completed';
        if (filterTime !== 'none') {
          const now = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          let from = now - oneDayMs;
          if (filterTime === 'week') from = now - 7 * oneDayMs;
          if (filterTime === 'month') from = now - 30 * oneDayMs;
          opts.createdFrom = new Date(from).toISOString();
          opts.createdTo = new Date(now).toISOString();
        }
        if (filterMembers.length > 0) {
          opts.members = filterMembers;
        }
        if (filterLabels.length > 0) {
          const labelNames = Array.from(new Set(filterLabels.map(l => l.name)));
          const labelColors = Array.from(new Set(filterLabels.map(l => l.color)));
          if (labelNames.length) opts.labelNames = labelNames;
          if (labelColors.length) opts.labelColors = labelColors;
        }
        // Keep a generous limit to cover board
        opts.limit = 500;
        const res = await cardService.filter(String(board._id), opts);
        setCards(res.cards as CardItem[]);
      } catch (err) {
        console.error('fetch filtered cards error', err);
        // do not toast repeatedly on every change to avoid noise
      }
    };
    fetchFiltered();
  }, [id, board?._id, filterStatus, filterTime, filterMembers, filterLabels, isFilterEnabled]);

  // When filters are cleared after being active, restore full board cards
  // const hadFiltersRef = useRef(false);
 useEffect(() => {
  if (!board?._id) return;
  // Only fetch the full board when filters are NOT enabled
  if (isFilterEnabled) return;

  const fetchAll = async () => {
    try {
      const data = await boardService.get(String(board._id));
      const fullCards = data.cards || [];
      setCards(fullCards);
      setAllCards(fullCards);
      setLists(data.lists || []);
    } catch (err) {
      console.error("Failed to fetch board data:", err);
    }
  };

  fetchAll();
}, [board?._id, isFilterEnabled]);

  // Socket.IO setup - use boardId as dependency to avoid unnecessary re-runs
  useEffect(() => {
    if (!board?._id) return;

    // Connect socket once
    const socket = socketService.connect();
    if (!socket) return;

    // Join board room
    socketService.joinBoard(board._id);

    // Set up event listeners with proper type assertions
    const handleBoardUpdated = (data: { board?: unknown; action?: string; updatedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.board && (data.board as { _id: string })._id === board._id) {
        setBoard(data.board as Board);
      }
    };

    const handleListCreated = (data: { list?: unknown; createdBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.list) {
        setLists(prev => [...prev, data.list as ListItem]);
      }
    };

    const handleListUpdated = (data: { list?: unknown; action?: string; updatedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.list) {
        setLists(prev => prev.map(list => 
          list._id === (data.list as ListItem)._id ? data.list as ListItem : list
        ));
      }
    };

    const handleListDeleted = (data: { listId?: string; deletedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.listId) {
        setLists(prev => prev.filter(list => list._id !== data.listId));
        setCards(prev => prev.filter(card => card.listId !== data.listId));
      }
    };

    const handleCardCreated = (data: { card?: unknown; createdBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.card) {
        setCards(prev => [...prev, data.card as CardItem]);
      }
    };

    const handleCardUpdated = (data: { card?: unknown; action?: string; updatedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.card) {
        setCards(prev => prev.map(card => 
          card._id === (data.card as CardItem)._id ? data.card as CardItem : card
        ));
      }
    };

    const handleCardDeleted = (data: { cardId?: string; listId?: string; deletedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.cardId) {
        setCards(prev => prev.filter(card => card._id !== data.cardId));
      }
    };

    const handleCardMoved = (data: { cardId?: string; fromListId?: string; toListId?: string; newPosition?: number; movedBy?: { id: string; email?: string }; [key: string]: unknown }) => {
      if (data.cardId && data.fromListId && data.toListId) {
        setCards(prev => prev.map(card => {
          if (card._id === data.cardId) {
            return { ...card, listId: data.toListId! };
          }
          return card;
        }));
      }
    };

    // Register event listeners
    socketService.onBoardUpdated(handleBoardUpdated);
    socketService.onListCreated(handleListCreated);
    socketService.onListUpdated(handleListUpdated);
    socketService.onListDeleted(handleListDeleted);
    socketService.onCardCreated(handleCardCreated);
    socketService.onCardUpdated(handleCardUpdated);
    socketService.onCardDeleted(handleCardDeleted);
    socketService.onCardMoved(handleCardMoved);

    // Cleanup on unmount
    return () => {
      socketService.leaveBoard(board._id);
      socketService.off('board-updated', handleBoardUpdated);
      socketService.off('list-created', handleListCreated);
      socketService.off('list-updated', handleListUpdated);
      socketService.off('list-deleted', handleListDeleted);
      socketService.off('card-created', handleCardCreated);
      socketService.off('card-updated', handleCardUpdated);
      socketService.off('card-deleted', handleCardDeleted);
      socketService.off('card-moved', handleCardMoved);
    };
  }, [board?._id]);


  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await boardService.get(id);
        
        // Check if user has access to this board
        if (!data.userRole || data.userRole === null) {
          toast.error('Không có quyền truy cập', {
            description: 'Bạn không phải là thành viên của bảng này'
          });
          navigate('/');
          return;
        }
        
        setBoard(ensureOwnerInMembers(data.board as unknown as Partial<Board>));
        setLists((data.lists || []) as ListItem[]);
        const fullCards = (data.cards || []) as CardItem[];
        setCards(fullCards);
        setAllCards(fullCards);
        setUserRole(data.userRole);
      } catch (err: unknown) {
        console.error('load board error', err);
        
        // If 403 Forbidden, redirect to dashboard
        if ((err as { response?: { status?: number } })?.response?.status === 403) {
          toast.error('Không có quyền truy cập', {
            description: 'Bạn không có quyền xem bảng này'
          });
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, ensureOwnerInMembers, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!showFilterMenu) return;
      const clickedInsideButton = filterRef.current?.contains(target);
      const clickedInsidePortal = portalRef.current?.contains(target);
      if (!clickedInsideButton && !clickedInsidePortal) {
        setShowFilterMenu(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilterMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showFilterMenu]);

  // Close list action menu when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!openListMenu) return;
      const target = e.target as HTMLElement;
      // Close if click is outside any list menu container
      if (!target.closest('.list-menu-container')) {
        setOpenListMenu(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openListMenu]);

  const availableMembers = useMemo(() => {
    const raw = board?.members || [];
    const list: Array<{ _id: string; name: string; avatarUrl?: string }> = [];
    raw.forEach((m) => {
      if (typeof m === 'string') {
        list.push({ _id: String(m), name: 'Người dùng' });
      } else if (m && typeof m === 'object') {
        const mid = String(m._id || '');
        if (!mid) return;
        list.push({ _id: mid, name: m.displayName || m.username || 'Người dùng', avatarUrl: m.avatarUrl });
      }
    });
    const map = new Map<string, { _id: string; name: string; avatarUrl?: string }>();
    list.forEach((it) => map.set(it._id, it));
    return Array.from(map.values());
  }, [board?.members]);

  const availableLabels = useMemo(() => {
    const source = (allCards && allCards.length > 0) ? allCards : cards;
    const map = new Map<string, { color: string; name: string }>();
    source.forEach((c) => {
      (c.labels || []).forEach((l) => {
        const key = `${l.color}:${l.name}`;
        if (!map.has(key)) map.set(key, { color: l.color, name: l.name });
      });
    });
    return Array.from(map.values());
  }, [allCards, cards]);

  const { t } = useTranslation();

  const toggleMemberFilter = (memberId: string) => {
    setFilterMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const toggleLabelFilter = (label: { color: string; name: string }) => {
    setFilterLabels((prev) => {
      const idx = prev.findIndex((l) => l.color === label.color && l.name === label.name);
      if (idx !== -1) return prev.filter((_, i) => i !== idx);
      return [...prev, label];
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header skeleton */}
        <div className="bg-card/80 backdrop-blur-sm px-6 py-3.5 shadow-sm border-b border-border/50">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-24" />
            <div className="h-8 w-px bg-border mx-2" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>

        {/* Columns skeleton */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className="h-full px-6 py-5 flex gap-4 min-w-min">
            {[0,1,2,3].map((i) => (
              <div key={i} className="shrink-0 w-[85vw] md:w-80 flex flex-col h-full gap-3">
                <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                  <div className="h-1 bg-muted" />
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-1">
                  {[0,1,2,3].map((j) => (
                    <div key={j} className="bg-card rounded-lg border border-border p-3">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // prepare outlet context for route-mounted CardModal
  const outletContext = {
    board,
    lists,
    cards,
    setCards,
    user,
    commentText,
    setCommentText,
    postingComment,
    handlePostComment,
    handleDeleteComment,
    handleAddMember,
    handleRemoveMember,
    handleAddLabel,
    handleRemoveLabel,
    parseLabel,
    handleToggleComplete,
    handleEditCardSubmit,
    handleDeleteCard,
    setShowEditCard,
    setEditingCardId,
    setEditCardTitle,
    setEditCardDesc,
    setOpenCardMenu,
  } as const;

  // Get background style
  const getBackgroundStyle = () => {
    if (!board?.background) return { backgroundColor: '#ffffff' };
    
    // Check if it's a gradient
    if (board.background.includes('gradient')) {
      return { background: board.background };
    }
    
    // Check if it's an image URL
    if (board.background.startsWith('url(')) {
      return {
        background: board.background,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    
    // Otherwise it's a solid color
    return { backgroundColor: board.background };
  };

  return (
    <div className="flex flex-col h-screen pt-14 sm:pt-0" style={getBackgroundStyle()}>
      {/* Compact Modern Header */}
      <header className="bg-card/80 backdrop-blur-sm px-6 py-2 sm:py-3.5 flex items-center justify-between shadow-sm border-b border-border/50 fixed top-0 left-0 right-0 z-50 sm:static">
        <div className="flex items-center gap-4">
        

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-chat flex items-center justify-center shadow-soft overflow-hidden cursor-pointer"
                onClick={() => window.location.href = "/"}
              >
                <img
                  src="/kanban.png"
                  alt="avatar"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

          <div className="h-8 w-px bg-border mx-2"></div>

          {isEditingBoardTitle ? (
            <Input
              value={inlineBoardTitle}
              onChange={(e) => setInlineBoardTitle(e.target.value)}
              onBlur={() => commitInlineBoardTitle()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitInlineBoardTitle();
                } else if (e.key === 'Escape') {
                  setIsEditingBoardTitle(false);
                  setInlineBoardTitle('');
                }
              }}
              className="h-9 text-xl font-bold px-2 max-w-md border-primary/50"
              autoFocus
            />
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <h1
                className={`text-lg sm:text-xl font-bold text-foreground truncate max-w-md ${canEdit ? 'cursor-pointer hover:text-primary/80' : 'cursor-default'} transition-colors`}
                onDoubleClick={() => {
                  if (canEdit) {
                    setInlineBoardTitle(board?.title || '');
                    setIsEditingBoardTitle(true);
                  } else if (isViewer) {
                    toast.info('Bạn không có quyền chỉnh sửa tiêu đề board');
                  }
                }}
                title={canEdit ? 'Nhấp đúp để chỉnh sửa' : isViewer ? 'Chế độ chỉ xem' : ''}
              >
                {board?.title || 'My Board'}
              </h1>
              {isViewer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-md border border-amber-300 dark:border-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  CHỈ XEM
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className={`glass border-border hover:bg-accent rounded-xl h-9 px-3 transition-all ${
              !isOwner ? 'opacity-60 cursor-not-allowed saturate-50' : ''
            }`}
            onClick={() => {
              if (!isOwner) {
                toast.warning('🎨 Chỉ chủ sở hữu board mới có thể thay đổi nền', {
                  description: isViewer ? 'Bạn đang ở chế độ chỉ xem' : 'Bạn cần là chủ sở hữu board',
                  duration: 4000
                });
                return;
              }
              setShowBackgroundPicker(true);
            }}
            disabled={!isOwner}
            title={!isOwner ? '🔒 Chỉ chủ sở hữu mới có thể thay đổi nền' : t('board.background')}
          >
            <Palette className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">{t('board.background')}</span>
          </Button>

          <div className="relative filter-menu-container" ref={filterRef}>
              <Button 
              variant="outline" 
              size="sm"
              className={`glass border-border hover:bg-accent rounded-xl h-9 px-3 ${
                (filterStatus !== 'none' || filterTime !== 'none' || filterMembers.length > 0 || filterLabels.length > 0)
                  ? 'bg-primary/10 border-primary/30'
                  : ''
              }`}
              onClick={() => {
                if (showFilterMenu) setShowFilterMenu(false);
                else openFilterMenuAtButton();
              }}
            >
              <Filter className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">
                {filterStatus === 'none' && filterTime === 'none' && t('filter')}
                {filterStatus !== 'none' && filterTime === 'none' && (
                  filterStatus === 'completed' ? 'Hoàn thành' : 'Chưa hoàn thành'
                )}
                {filterStatus === 'none' && filterTime !== 'none' && (
                  filterTime === 'today' ? 'Hôm nay' : filterTime === 'week' ? '7 ngày' : '30 ngày'
                )}
                {filterStatus !== 'none' && filterTime !== 'none' && (
                  `${filterStatus === 'completed' ? 'Hoàn' : 'Chưa'} · ${
                    filterTime === 'today' ? 'Hôm nay' : filterTime === 'week' ? '7d' : '30d'
                  }`
                )}
              </span>
            </Button>


            {/* Filter Dropdown Menu (portal) */}
            {showFilterMenu && filterMenuPos && createPortal(
              <div
                ref={portalRef}
                style={{ position: 'fixed', top: filterMenuPos.top, left: filterMenuPos.left, width: 224 }}
                className="bg-card border border-border rounded-xl shadow-glow z-50 overflow-hidden max-h-[70vh] overflow-y-auto custom-scrollbar"
              >
                {/* Status Filter Section */}
                <div className="border-b border-border">
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Trạng thái</h4>
                  </div>
                 <button
                    className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${
                      filterStatus === 'completed'
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground'
                    }`}
                    onClick={() => {
                      setFilterStatus('completed');
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                      <polyline points="9 12 12 15 16 10" />
                    </svg>

                    Đã hoàn thành
                  </button>

                 <button
                  className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${
                    filterStatus === 'incomplete'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground'
                  }`}
                  onClick={() => {
                    setFilterStatus('incomplete');
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                  </svg>

                  Chưa hoàn thành
                </button>

                </div>

                {/* Time Filter Section */}
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Thời gian tạo</h4>
                  </div>
                  {/* 'All' options removed — use Reset to clear filters and reload full board */}
                  <button
                    className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${
                      filterTime === 'today' ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    }`}
                    onClick={() => {
                      setFilterTime('today');
                    }}
                  >
                    <Clock className="w-4 h-4" />
                    Hôm nay
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${
                      filterTime === 'week' ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    }`}
                    onClick={() => {
                      setFilterTime('week');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    7 ngày qua
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${
                      filterTime === 'month' ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    }`}
                    onClick={() => {
                      setFilterTime('month');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    30 ngày qua
                  </button>
                </div>

                {/* Labels Filter Section */}
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Nhãn</h4>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar py-1">
                    {availableLabels.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">Chưa có nhãn</div>
                    ) : (
                      availableLabels.map((l) => {
                        const active = !!filterLabels.find(fl => fl.color === l.color && fl.name === l.name);
                        return (
                          <button
                            key={`${l.color}:${l.name}`}
                            className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}`}
                            onClick={() => toggleLabelFilter(l)}
                          >
                            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
                            <span className="truncate">{l.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Members Filter Section */}
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-muted/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Thành viên</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                    {availableMembers.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">Chưa có thành viên</div>
                    ) : (
                      availableMembers.map(m => {
                        const active = filterMembers.includes(m._id);
                        return (
                          <button
                            key={m._id}
                            className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 text-sm ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}`}
                            onClick={() => toggleMemberFilter(m._id)}
                          >
                            <div className="w-5 h-5 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className="truncate">{m.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Apply/Reset Buttons */}
                <div className="border-t border-border p-2 flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    onClick={() => {
                      setFilterStatus('none');
                      setFilterTime('none');
                      setFilterMembers([]);
                      setFilterLabels([]);
                      setShowFilterMenu(false);
                    }}
                  >
                    Đặt lại
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
                    onClick={() => {
                      setShowFilterMenu(false);
                    }}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>

          <Button 
            onClick={() => {
              if (isViewer) {
                toast.warning('🔒 Bạn chỉ có quyền xem board này', {
                  description: 'Liên hệ chủ sở hữu để được cấp quyền chỉnh sửa',
                  duration: 4000
                });
                return;
              }
              setShowCreateList(true);
            }} 
            className={`bg-gradient-chat text-primary-foreground shadow-glow hover:shadow-glow rounded-xl h-9 px-3 sm:px-4 font-medium transition-all ${
              isViewer ? 'opacity-60 cursor-not-allowed saturate-50' : ''
            }`}
            disabled={isViewer}
            title={isViewer ? '🔒 Chế độ chỉ xem - Không thể thêm danh sách' : t('board.addNewList')}
          >
            <Plus className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">{t('board.addNewList')}</span>
          </Button>

          <div className="h-8 w-px bg-border mx-1"></div>

          <SimpleThemeToggle />
          <LanguageSwitcher />
          <NotificationPanel />

          <div className="relative">
                    {/* Removed 'All' time option per UX: filters are opt-in; use Reset to load all */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-chat rounded-xl shadow-soft hover:shadow-glow transition-all cursor-pointer"
              onMouseEnter={() => setShowUserPreview(true)}
              onMouseLeave={() => setShowUserPreview(false)}
              onClick={() => navigate('/profile')}
            >
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-xs">{(user?.username?.[0] || 'U').toUpperCase()}</span>
                )}
              </div>
            </div>

            {showUserPreview && (
              <div className="absolute right-0 top-full mt-2 z-100">
                <Card className="w-64 glass-strong shadow-glow border-border message-bounce">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-chat flex items-center justify-center text-white font-bold text-sm">
                            {(user?.username?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate text-sm">{user?.displayName || user?.username}</h4>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">Điện thoại:</span>
                        <span className="text-foreground">{user?.phone || 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Board Info Bar */}
      <div className="px-6 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between relative">
        {isViewer && (
          <>
            {/* Professional Read-Only Banner */}
            <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 text-white px-6 py-3.5 shadow-xl z-[100] border-b-2 border-amber-600/50 dark:border-amber-700/50 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-bold text-sm sm:text-base tracking-wide">CHẾ ĐỘ CHỈ XEM</span>
                    <span className="hidden sm:inline text-white/60">│</span>
                    <span className="text-xs sm:text-sm text-white/95 font-medium">Bạn không có quyền chỉnh sửa nội dung của board này</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <span className="text-xs font-medium">Read-Only Mode</span>
                </div>
              </div>
            </div>
            
            {/* Subtle Watermark Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[5] flex items-center justify-center opacity-100">
              <div className="text-[180px] font-black text-amber-500/[0.04] dark:text-amber-400/[0.03] select-none rotate-[-25deg] tracking-wider">
                READ ONLY
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-6" style={isViewer ? {marginTop: '56px'} : {}}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full status-online"></div>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{lists.length}</span> {t('common.lists')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-online rounded-full status-online"></div>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{cards.length}</span> {t('common.cards')}
            </span>
          </div>
          {(filterStatus !== 'none' || filterTime !== 'none' || filterMembers.length > 0 || filterLabels.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterStatus !== 'none' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/30">
                  <Filter className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">
                    {filterStatus === 'completed' && 'Hoàn thành'}
                    {filterStatus === 'incomplete' && 'Chưa hoàn thành'}
                  </span>
                  <button 
                    onClick={() => setFilterStatus('none')}
                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    aria-label="Xóa bộ lọc trạng thái"
                  >
                    <X className="w-3 h-3 text-primary" />
                  </button>
                </div>
              )}
              {filterTime !== 'none' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-online/10 rounded-lg border border-online/30">
                  <Clock className="w-3 h-3 text-online" />
                  <span className="text-xs text-online font-medium">
                    {filterTime === 'today' && 'Hôm nay'}
                    {filterTime === 'week' && '7 ngày qua'}
                    {filterTime === 'month' && '30 ngày qua'}
                  </span>
                  <button 
                    onClick={() => setFilterTime('none')}
                    className="ml-1 hover:bg-online/20 rounded-full p-0.5 transition-colors"
                    aria-label="Xóa bộ lọc thời gian"
                  >
                    <X className="w-3 h-3 text-online" />
                  </button>
                </div>
              )}
              {filterLabels.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border">
                  <Tag className="w-3 h-3" />
                  <span className="text-xs font-medium text-foreground">{filterLabels.length} nhãn</span>
                  <button 
                    onClick={() => setFilterLabels([])}
                    className="ml-1 hover:bg-muted/60 rounded-full p-0.5 transition-colors"
                    aria-label="Xóa bộ lọc nhãn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {filterMembers.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border">
                  <Users className="w-3 h-3" />
                  <span className="text-xs font-medium text-foreground">{filterMembers.length} thành viên</span>
                  <button 
                    onClick={() => setFilterMembers([])}
                    className="ml-1 hover:bg-muted/60 rounded-full p-0.5 transition-colors"
                    aria-label="Xóa bộ lọc thành viên"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
          
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg h-8 px-2">
            <Star className="w-4 h-4 mr-0 sm:mr-1" />
            <span className="hidden sm:inline">{t('board.starred')}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={`glass border-border hover:bg-accent rounded-lg h-8 relative transition-all ${
              !isOwner ? 'opacity-60 cursor-not-allowed saturate-50' : ''
            }`}
            onClick={() => {
              if (!isOwner) {
                toast.warning('👥 Chỉ chủ sở hữu board mới có thể mời thành viên', {
                  description: isViewer ? 'Bạn đang ở chế độ chỉ xem' : 'Liên hệ chủ sở hữu để được cấp quyền',
                  duration: 4000
                });
                return;
              }
              setShowShareModal(true);
            }}
            disabled={!isOwner}
            title={!isOwner ? '🔒 Chỉ chủ sở hữu mới có thể mời thành viên' : 'Chia sẻ board'}
          >
            <Users className="w-4 h-4 mr-0 sm:mr-1" />
            <span className="hidden sm:inline">{t('board.share')}</span>
            {board?.members && board.members.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold hidden sm:inline">
                {board.members.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div className="h-full px-6 py-5 flex gap-4 min-w-min">
          {lists.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Grid3x3 className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold mb-2">{t('board.noLists')}</p>
                <p className="text-muted-foreground text-sm mb-4">{t('board.createFirstBoard')}</p>
                <Button onClick={() => setShowCreateList(true)} className="bg-gradient-chat text-primary-foreground shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('board.createList')}
                </Button>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lists.map(l => String(l._id))}
                strategy={horizontalListSortingStrategy}
              >
                {lists.map((list, index) => {
                const listCards = cards.filter((c) => String(c.listId) === String(list._id));
                const totalCards = listCards.length;
                const accentClass = `list-accent-${(index % 5) + 1}`;

                return (
                  <SortableList key={list._id} list={list} index={index}>
                    <div className="shrink-0 w-[85vw] md:w-80 flex flex-col h-full gap-3 relative">
                    {/* List Header - Standalone */}
                    <div className="bg-card rounded-lg shadow-sm border border-border shrink-0 overflow-hidden">
                      <div className={`h-1 ${accentClass}`}></div>
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                          {inlineEditingListId === String(list._id) ? (
                            <input
                              className="font-semibold text-foreground text-base truncate text-center flex-1 bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              value={inlineListTitle}
                              onChange={(e) => setInlineListTitle(e.target.value)}
                              onBlur={() => commitInlineListTitle(String(list._id))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitInlineListTitle(String(list._id));
                                } else if (e.key === 'Escape') {
                                  setInlineEditingListId(null);
                                  setInlineListTitle('');
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <h2
                              className="font-semibold text-foreground text-base truncate text-center flex-1 cursor-text"
                              title="Nhấn đúp để chỉnh sửa"
                              onDoubleClick={() => {
                                setInlineEditingListId(String(list._id));
                                setInlineListTitle(list.title);
                              }}
                            >
                              {list.title}
                            </h2>
                          )}
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                            {filterStatus === 'none' ? totalCards : `${listCards.length}/${totalCards}`}
                          </span>
                        </div>
                       
                        <Button
                          variant="ghost"
                          size="icon"
                          data-no-drag="true"
                          className="h-7 w-7 hover:bg-muted rounded-lg shrink-0"
                          onPointerDown={(e) => { e.stopPropagation(); }}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            e.preventDefault();
                            console.log('Menu button clicked!');
                            setOpenListMenu(openListMenu === String(list._id) ? null : String(list._id)); 
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Menu Dropdown - Positioned outside header */}
                    {openListMenu === String(list._id) && (
                      <div 
                        data-no-drag="true"
                        className="absolute top-[60px] right-4 w-48 bg-card border border-border rounded-lg shadow-2xl p-1.5 animate-in fade-in-50 slide-in-from-top-2 duration-200"
                        style={{ zIndex: 9999 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm transition-colors"
                          onClick={() => {
                            setEditingListId(String(list._id));
                            setEditListTitle(list.title);
                            setShowEditList(true);
                            setOpenListMenu(null);
                          }}
                        >
                          Sửa danh sách
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm text-destructive transition-colors"
                          onClick={() => {
                            setOpenListMenu(null);
                            setDeleteListId(String(list._id));
                            setShowDeleteListConfirm(true);
                          }}
                        >
                          Xóa danh sách
                        </button>
                        {canEdit && (
                          <button
                            className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm transition-colors"
                            onClick={() => {
                              setAddCardListId(String(list._id));
                              setShowAddCard(true);
                              setOpenListMenu(null);
                            }}
                          >
                            Thêm thẻ
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cards Container - Scrollable */}
                    <DroppableList listId={String(list._id)}>
                      <SortableContext
                        items={listCards.map(c => String(c._id))}
                        strategy={verticalListSortingStrategy}
                      >
                        {listCards.map((task) => (
                          <SortableCard key={task._id} card={task}>
                            <div className="relative">
                            <Card 
                              className="group bg-card hover:shadow-md transition-all duration-200 border border-border/60 hover:border-primary/50 rounded-lg cursor-pointer overflow-hidden"
                              onClick={() => navigate(`card/${task._id}`)}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    {/* Checkbox for completion */}
                                    <input
                                      type="checkbox"
                                      checked={task.completed || false}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleToggleComplete(String(task._id), task.completed || false);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-0.5 w-4 h-4 rounded border-2 border-muted-foreground/40 text-primary focus:ring-2 focus:ring-primary/30 cursor-pointer shrink-0"
                                    />
                                    <p className={`text-sm font-medium leading-relaxed flex-1 min-w-0 truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                                      {task.title}
                                    </p>
                                  </div>
                                  
                                  {/* Card Menu Button */}
                                  {canEdit && (
                                    <div className="relative">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-muted rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenCardMenu(openCardMenu === String(task._id) ? null : String(task._id));
                                        }}
                                      >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        <path d="m15 5 4 4" />
                                      </svg>
                                    </Button>

                                    {/* Dropdown Menu */}
                                    {openCardMenu === String(task._id) && (
                                      <div className="absolute right-full mr-2 top-0 w-48 bg-card border border-border rounded-xl shadow-glow z-50 overflow-hidden">
                                        <button
                                          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 text-sm text-foreground"
                                          onClick={() => {
                                            navigate(`card/${task._id}`);
                                            setOpenCardMenu(null);
                                          }}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <rect width="18" height="18" x="3" y="3" rx="2" />
                                            <path d="M9 3v18" />
                                            <rect width="6" height="6" x="15" y="9" rx="1" />
                                          </svg>
                                          Mở Thẻ
                                        </button>
                                        <button
                                          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 text-sm text-foreground"
                                          onClick={() => {
                                            setEditingCardId(String(task._id));
                                            setEditCardTitle(task.title);
                                            setEditCardDesc(task.description || '');
                                            setShowEditCard(true);
                                            setOpenCardMenu(null);
                                          }}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                            <path d="m15 5 4 4" />
                                          </svg>
                                          Chỉnh sửa thẻ
                                        </button>
                                        <button
                                          className="w-full text-left px-4 py-3 hover:bg-destructive/10 transition-colors flex items-center gap-3 text-sm text-destructive"
                                          onClick={() => {
                                            setOpenCardMenu(null);
                                            setDeleteCardId(String(task._id));
                                            setShowDeleteConfirm(true);
                                          }}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <path d="M3 6h18" />
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                          </svg>
                                          Xóa thẻ
                                        </button>
                                      </div>
                                    )}
                                    </div>
                                  )}
                                </div>

                                {/* Labels Display */}
                                {task.labels && task.labels.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
                                    {task.labels.map((label, idx) => {
                                      const { color, text } = parseLabel(label);
                                      return (
                                        <span
                                          key={idx}
                                          className="text-xs px-2 py-0.5 rounded-md font-medium text-white"
                                          style={{ backgroundColor: color }}
                                        >
                                          {text}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Card Footer */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    {/* Display members */}
                                    <div className="flex -space-x-1.5">
                                      {task.members && task.members.length > 0 ? (
                                        <>
                                          {task.members.slice(0, 3).map((member, idx) => {
                                            const memberObj = typeof member === 'object' ? member : null;
                                            if (!memberObj) return null;
                                            
                                            const displayName = memberObj.displayName || memberObj.username || 'U';
                                            const initial = displayName[0]?.toUpperCase() || 'U';
                                            
                                            return (
                                              <div 
                                                key={idx}
                                                className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-xs font-bold"
                                                style={{ background: 'linear-gradient(135deg, hsl(200, 100%, 65%), hsl(210, 100%, 75%))' }}
                                                title={displayName}
                                              >
                                                {memberObj.avatarUrl ? (
                                                  <img 
                                                    src={memberObj.avatarUrl} 
                                                    alt={displayName} 
                                                    className="w-full h-full rounded-full object-cover" 
                                                  />
                                                ) : (
                                                  initial
                                                )}
                                              </div>
                                            );
                                          })}
                                          {task.members.length > 3 && (
                                            <div 
                                              className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"
                                              title={`+${task.members.length - 3} thành viên khác`}
                                            >
                                              +{task.members.length - 3}
                                            </div>
                                          )}
                                        </>
                                      ) : task.createdBy ? (
                                        <div 
                                          className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-xs font-bold"
                                          style={{ background: 'linear-gradient(135deg, hsl(200, 100%, 65%), hsl(210, 100%, 75%))' }}
                                          title={task.createdBy.displayName || task.createdBy.username || 'User'}
                                        >
                                          {task.createdBy.avatarUrl ? (
                                            <img 
                                              src={task.createdBy.avatarUrl} 
                                              alt={task.createdBy.displayName || task.createdBy.username} 
                                              className="w-full h-full rounded-full object-cover" 
                                            />
                                          ) : (
                                            (task.createdBy.displayName || task.createdBy.username || 'U')[0].toUpperCase()
                                          )}
                                        </div>
                                      ) : (
                                        <div 
                                          className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-xs font-bold"
                                          style={{ background: 'linear-gradient(135deg, hsl(200, 100%, 65%), hsl(210, 100%, 75%))' }}
                                        >
                                          U
                                        </div>
                                      )}
                                    </div>
                                    {task.completed && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-online/20 text-online font-medium flex items-center gap-1">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="12"
                                          height="12"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Hoàn thành
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap justify-end">
                                    {/* Comments count */}
                                    {task.comments && task.comments.length > 0 && (
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-xs">{task.comments.length}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-muted-foreground" title={task.createdAt ? formatFullDateTime(task.createdAt) : ''}>
                                      <Calendar className="w-3 h-3" />
                                      <span className="text-xs">{timeAgo(task.createdAt) || 'Mới tạo'}</span>
                                    </div>
                                    {(task as CardItem).dueDate && (
                                      <div 
                                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isOverdue((task as CardItem).dueDate, task.completed) ? 'bg-red-600 text-white' : 'bg-primary/10 text-primary font-medium'}`}
                                        title={formatFullDateTime((task as CardItem).dueDate || '')}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isOverdue((task as CardItem).dueDate, task.completed) ? 'text-white' : 'text-primary'}`}>
                                          <path d="M21 10h-6l-2-2H7v10h10v-2h4z" />
                                        </svg>
                                        <span>{formatDueDate((task as CardItem).dueDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                            </div>
                          </SortableCard>
                        ))}
                      </SortableContext>

                      {canEdit && (
                        <button
                          className="w-full p-2.5 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border/50 hover:border-primary/50 transition-all"
                          onClick={() => {
                            setAddCardListId(String(list._id));
                            setShowAddCard(true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Thêm thẻ</span>
                          </div>
                        </button>
                      )}
                    </DroppableList>
                  </div>
                  </SortableList>
                );
              })}

              {/* Add List Button */}
              {canEdit && (
                <div className="shrink-0 w-[85vw] md:w-80">
                  <button 
                    onClick={() => setShowCreateList(true)}
                    className="w-full h-24 bg-muted/30 border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 rounded-lg transition-all duration-200 group"
                  >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-9 h-9 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Thêm danh sách
                    </span>
                  </div>
                </button>
              </div>
              )}
            </SortableContext>
            <DragOverlay>
              {activeListId ? (
                <div className="shrink-0 w-[85vw] md:w-80 flex flex-col h-full gap-3 opacity-50">
                  <div className="bg-card rounded-lg shadow-lg border border-border">
                    <div className="h-1 bg-primary rounded-t-lg"></div>
                    <div className="px-4 py-2.5">
                      <h2 className="font-semibold text-foreground text-base text-center">
                        {lists.find(l => String(l._id) === activeListId)?.title}
                      </h2>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      {showCreateList && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateList(false)} />
          <form onSubmit={createLocalList} className="relative w-full max-w-md glass-strong p-6 rounded-2xl shadow-glow border border-border animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-chat flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
                {t('board.createList')}
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCreateList(false)}
                className="hover:bg-muted rounded-lg"
                type="button"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  {t('board.listTitle')}
                </label>
                <Input 
                  value={newListTitle} 
                  onChange={(e) => setNewListTitle(e.target.value)} 
                  placeholder="Example: To do, In Progress, Done..." 
                  className="glass border-border focus:ring-2 focus:ring-primary/30 h-11 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateList(false)} 
                type="button"
                className="hover:bg-muted rounded-xl px-5"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-chat text-primary-foreground shadow-glow px-6 rounded-xl"
              >
                {t('board.createList')}
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Edit List Modal */}
      {showEditList && editingListId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditList(false)} />
          <form onSubmit={handleEditListSubmit} className="relative w-full max-w-lg glass-strong p-8 rounded-2xl shadow-glow border border-border animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-chat flex items-center justify-center shadow-lg">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Chỉnh sửa danh sách</h3>
                  <p className="text-xs text-muted-foreground">Cập nhật thông tin danh sách</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditList(false)} className="hover:bg-muted rounded-xl transition-colors" type="button">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-chat rounded-full"></div>
                  Tiêu đề danh sách
                </label>
                <Input 
                  value={editListTitle} 
                  onChange={(e) => setEditListTitle(e.target.value)} 
                  placeholder="Nhập tiêu đề danh sách..."
                  className="glass border-border focus:ring-2 focus:ring-primary/30 h-12 rounded-xl text-base" 
                  autoFocus 
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowEditList(false)} 
                type="button" 
                className="border-border hover:bg-muted rounded-xl px-6 h-11"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-chat text-black shadow-lg hover:shadow-xl px-8 rounded-xl h-11 font-semibold transition-all"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Add Card Modal */}
      {showAddCard && addCardListId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCard(false)} />
          <form onSubmit={handleAddCardSubmit} className="relative w-full max-w-2xl glass-strong p-8 rounded-2xl shadow-glow border border-border animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-chat flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Tạo thẻ mới</h3>
                  <p className="text-xs text-muted-foreground">Thêm thẻ công việc vào danh sách</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddCard(false)} className="hover:bg-muted rounded-xl transition-colors" type="button">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-chat rounded-full"></div>
                  Tiêu đề thẻ
                  <span className="text-destructive">*</span>
                </label>
                <Input 
                  value={newCardTitle} 
                  onChange={(e) => setNewCardTitle(e.target.value)} 
                  placeholder="Nhập tiêu đề thẻ..." 
                  className="glass border-border focus:ring-2 focus:ring-primary/30 h-12 rounded-xl text-base" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-muted rounded-full"></div>
                  Mô tả chi tiết
                  <span className="text-xs text-muted-foreground font-normal">(Tùy chọn)</span>
                </label>
                <textarea 
                  value={newCardDesc} 
                  onChange={(e) => setNewCardDesc(e.target.value)} 
                  placeholder="Thêm mô tả chi tiết cho thẻ này..."
                  className="w-full min-h-32 p-4 glass border-border rounded-xl resize-none focus:ring-2 focus:ring-primary/30 focus:outline-none text-base leading-relaxed"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddCard(false)} 
                type="button" 
                className="border-border hover:bg-muted rounded-xl px-6 h-11"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-chat text-black shadow-lg hover:shadow-xl px-8 rounded-xl h-11 font-semibold transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo thẻ
              </Button>
            </div>
          </form>
        </div>,
        document.body
      )}

  <Outlet context={outletContext} />
  {/* Support direct URL /board/:id/card/:cardId by rendering CardModal with same context */}
  {cardIdParam && <CardModal ctxProp={outletContext} />}

      {/* Edit Card Modal */}
      {showEditCard && editingCardId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditCard(false)} />
          <form onSubmit={handleEditCardSubmit} className="relative w-full max-w-md glass-strong p-6 rounded-2xl shadow-glow border border-border animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-chat flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
                Chỉnh sửa thẻ
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowEditCard(false)} className="hover:bg-muted rounded-lg" type="button">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Tiêu đề thẻ</label>
                <Input value={editCardTitle} onChange={(e) => setEditCardTitle(e.target.value)} placeholder="Tiêu đề" className="glass border-border h-11 rounded-xl" autoFocus />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Mô tả</label>
                <textarea value={editCardDesc} onChange={(e) => setEditCardDesc(e.target.value)} placeholder="Mô tả (tuỳ chọn)" className="w-full min-h-24 p-3 glass border-border rounded-xl" />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setDeleteCardId(editingCardId);
                    setShowDeleteConfirm(true);
                  }} 
                  type="button"
                >
                  Xóa
                </Button>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowEditCard(false)} type="button" className="hover:bg-muted rounded-xl px-5">Hủy</Button>
                <Button type="submit" className="bg-gradient-chat text-primary-foreground shadow-glow px-6 rounded-xl">Lưu</Button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteCardId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-glass-strong border border-border/40 rounded-2xl shadow-glow p-6 w-full max-w-md">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-destructive"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Xác nhận xóa thẻ</h3>
                <p className="text-muted-foreground">Bạn có chắc muốn xóa thẻ này không? Hành động này không thể hoàn tác.</p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteCardId(null);
                  }}
                  className="flex-1 rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCard}
                  className="flex-1 rounded-xl"
                >
                  Xóa
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal - Members Management & Invite */}
      {showShareModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Quản lý thành viên
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowShareModal(false);
                  setInviteEmail('');
                }}
                className="h-8 w-8 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">
                  Thành viên ({board?.members?.length || 0})
                </h4>
                {board?.members && board.members.length > 0 ? (
                  board.members.map((member, idx) => {
                    const memberObj = typeof member === 'object' ? member : null;
                    if (!memberObj) return null;
                    
                    const displayName = memberObj.displayName || memberObj.username || 'User';
                    const initial = displayName[0]?.toUpperCase() || 'U';
                    const isOwner = board.owner && (typeof board.owner === 'object' ? String(board.owner._id || board.owner) === String(memberObj._id) : String(board.owner) === String(memberObj._id));
                    const canRemove = user && (String(user._id) === (typeof board.owner === 'object' ? String(board.owner._id || board.owner) : String(board.owner)) || String(user._id) === String(memberObj._id));
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, hsl(200, 100%, 65%), hsl(210, 100%, 75%))' }}
                          >
                            {memberObj.avatarUrl ? (
                              <img src={memberObj.avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                              {isOwner && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                                  Chủ sở hữu
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{memberObj.username || 'Thành viên'}</p>
                          </div>
                        </div>
                        {canRemove && !isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => {
                              setMemberToRemove(memberObj);
                              setShowRemoveMemberConfirm(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">Chưa có thành viên nào</p>
                )}
              </div>
            </div>

            {/* Invite Form */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Mời thành viên mới</h4>
              <form onSubmit={handleInviteMember} className="space-y-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 h-11 rounded-xl text-gray-900 dark:text-white"
                  disabled={inviting}
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl rounded-xl h-11 font-semibold transition-all"
                  disabled={inviting}
                >
                  {inviting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang gửi lời mời...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Gửi lời mời
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberConfirm && memberToRemove && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-glass-strong border border-border/40 rounded-2xl shadow-glow p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Xác nhận xóa thành viên</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowRemoveMemberConfirm(false); setMemberToRemove(null); }} className="h-8 w-8 rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Bạn có chắc muốn xóa <span className="font-medium text-foreground">{typeof memberToRemove === 'object' && memberToRemove ? (memberToRemove.displayName || memberToRemove.username || 'thành viên này') : 'thành viên này'}</span> khỏi board này? Hành động này có thể ảnh hưởng đến quyền truy cập của họ.</p>

            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => { setShowRemoveMemberConfirm(false); setMemberToRemove(null); }} className="rounded-xl">Hủy</Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={async () => {
                  if (!board?._id || !memberToRemove) return;
                  if (typeof memberToRemove === "string") return;

                  const memberId = String(memberToRemove._id || "");
                  if (!memberId) return;

                  try {
                    const res = await boardService.removeMember(String(board._id), memberId);

                    if (res.board) {
                      const maybeBoard = res.board as Partial<Board>;
                      setBoard(ensureOwnerInMembers(maybeBoard));
                    }

                    toast.success(res.message || "Đã xóa thành viên");
                  } catch (err) {
                    console.error("remove member error", err);
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data
                        ?.message || "Xóa thành viên thất bại";
                    toast.error(msg);
                  } finally {
                    setShowRemoveMemberConfirm(false);
                    setMemberToRemove(null);
                  }
                }}
              >
                Xóa
              </Button>

            </div>
          </div>
        </div>
      , document.body)}

      {/* Delete List Confirmation Modal */}
      {showDeleteListConfirm && deleteListId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-glass-strong border border-border/40 rounded-2xl shadow-glow p-6 w-full max-w-lg">
            <div className="flex flex-col space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-destructive"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Xác nhận xóa danh sách</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(() => {
                      const cardsInList = cards.filter((c) => String(c.listId) === String(deleteListId));
                      const count = cardsInList.length;
                      if (count === 0) {
                        return 'Danh sách này không có thẻ nào. Bạn có chắc muốn xóa không?';
                      }
                      return `Danh sách này có ${count} thẻ. Bạn muốn xử lý các thẻ này như thế nào?`;
                    })()}
                  </p>
                  
                  {(() => {
                    const cardsInList = cards.filter((c) => String(c.listId) === String(deleteListId));
                    const otherLists = lists.filter((l) => String(l._id) !== String(deleteListId));
                    
                    if (cardsInList.length > 0 && otherLists.length > 0) {
                      return (
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="move-cards-option"
                              checked={showMoveCardsOption}
                              onChange={(e) => {
                                setShowMoveCardsOption(e.target.checked);
                                if (!e.target.checked) {
                                  setMoveCardsTargetList(null);
                                }
                              }}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/30"
                            />
                            <label htmlFor="move-cards-option" className="text-sm font-medium text-foreground cursor-pointer">
                              Di chuyển các thẻ sang danh sách khác
                            </label>
                          </div>
                          
                          {showMoveCardsOption && (
                            <div className="ml-6">
                              <label className="text-xs text-muted-foreground mb-2 block">Chọn danh sách đích:</label>
                              <select
                                value={moveCardsTargetList || ''}
                                onChange={(e) => setMoveCardsTargetList(e.target.value || null)}
                                className="w-full h-10 px-3 glass border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:outline-none text-sm"
                              >
                                <option value="">-- Chọn danh sách --</option>
                                {otherLists.map((list) => (
                                  <option key={list._id} value={String(list._id)}>
                                    {list.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteListConfirm(false);
                    setDeleteListId(null);
                    setMoveCardsTargetList(null);
                    setShowMoveCardsOption(false);
                  }}
                  className="flex-1 rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteList}
                  disabled={showMoveCardsOption && !moveCardsTargetList}
                  className="flex-1 rounded-xl"
                >
                  {showMoveCardsOption && moveCardsTargetList ? 'Di chuyển & Xóa' : 'Xóa'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Background Picker Modal */}
      {showBackgroundPicker && (
        <BackgroundPicker
          currentBackground={board?.background}
          onSelect={handleUpdateBackground}
          onClose={() => setShowBackgroundPicker(false)}
        />
      )}
  
    </div>
  );
};

export default BoardPage;