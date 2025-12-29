import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import useBoardStore from '@/stores/useBoardStore';
import type { Board } from '@/types/board';
import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import type { Workspace } from '@/types/workspace';
import api from '@/lib/axios';
import { Search, Plus, Sparkles, Edit2, Trash2, Star, Clock, Users, Layout, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from 'react';
import { toast } from "sonner";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import UpcomingCardsWidget from "@/components/board/UpcomingCardsWidget";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SimpleThemeToggle from "@/components/SimpleThemeToggle";
import { formatTimeAgo, formatFullDateTime } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';

const DashBoardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [showSidebarPreview, setShowSidebarPreview] = useState(false);
  const [showHeaderPreview, setShowHeaderPreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // On mobile, default to collapsed
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const creatingWorkspaceRef = useRef(false);
  const [showEditWorkspace, setShowEditWorkspace] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const editingWorkspaceRef = useRef(false);
  const [searchText, setSearchText] = useState('');
  const searchDebounceRef = useRef<number | null>(null);
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>(searchText);
  // Expanded workspaces
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<string[]>([]);
  // Members management
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedWorkspaceForMembers, setSelectedWorkspaceForMembers] = useState<Workspace | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  // Inline edit workspace name
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const editingInputRef = useRef<HTMLInputElement>(null);
    // Delete confirmation modals
  const [showDeleteBoardConfirm, setShowDeleteBoardConfirm] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [confirmWorkspaceName, setConfirmWorkspaceName] = useState('');

    const boards = useBoardStore((s) => s.boards);
  const loading = useBoardStore((s) => s.loading);
  const fetchBoards = useBoardStore((s) => s.fetchBoards);
  const addBoard = useBoardStore((s) => s.addBoard);
  const params = useParams();
  const routeWorkspaceId = params.id;

  
  // Boards are fetched from backend; use store result directly (`boards`).

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const submittingRef = useRef(false);


  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const editingRef = useRef(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchText(v);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      setDebouncedSearchText(v);
    }, 4000);
  };

  const getBackgroundStyle = (background?: string) => {
    if (!background) return {};
    
    if (background.startsWith('linear-gradient') || background.startsWith('radial-gradient')) {
      return { backgroundImage: background };
    }
    
    // Handle url(...) format
    if (background.startsWith('url(')) {
      return { 
        backgroundImage: background,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    
    // Handle plain URL
    if (background.startsWith('http://') || background.startsWith('https://')) {
      return { 
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    
    return { backgroundColor: background };
  };


  const onCreateWorkspace = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (creatingWorkspaceRef.current) return;
    if (!newWorkspaceName.trim() || newWorkspaceName.trim().length < 2) {
      toast.error('Tên không gian phải có ít nhất 2 ký tự');
      return;
    }
    try {
      creatingWorkspaceRef.current = true;
      const res = await api.post('/workspaces', { name: newWorkspaceName.trim() });
      const ws = res.data.workspace as Workspace | undefined;
      if (ws && ws._id) {
        setWorkspaces((s) => [...s, ws]);
        navigate(`/workspace/${ws._id}`);
        setSelectedWorkspaceId(ws._id);
      }
      setNewWorkspaceName('');
      setShowCreateWorkspace(false);
    } catch (err) {
      console.error('create workspace error', err);
      toast.error('Tạo không gian thất bại');
    } finally {
      creatingWorkspaceRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.get('/workspaces');
        const list = (res.data.workspaces || []) as Workspace[];
        setWorkspaces(list);

        if (!list.length) {
          setSelectedWorkspaceId(null);
          return;
        }

        // Sync selectedWorkspaceId with route
        if (routeWorkspaceId) {
          const found = list.find((w) => String(w._id) === String(routeWorkspaceId));
          if (found) {
            setSelectedWorkspaceId(found._id);
          } else {
            // Route has invalid workspace id, redirect to first workspace
            navigate(`/workspace/${list[0]._id}`, { replace: true });
            setSelectedWorkspaceId(list[0]._id);
          }
        } else {
          // No route workspace id, navigate to first workspace
          navigate(`/workspace/${list[0]._id}`, { replace: true });
          setSelectedWorkspaceId(list[0]._id);
        }
      } catch (err) {
        console.debug('load workspaces failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, routeWorkspaceId]); // Only sync when user or route changes

  useEffect(() => {
    if (!user) return;
    fetchBoards(selectedWorkspaceId ?? undefined, debouncedSearchText.trim() || undefined);
  }, [fetchBoards, selectedWorkspaceId, user, debouncedSearchText]);

  useEffect(() => {
    if (editingWorkspaceId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingWorkspaceId]);

  useEffect(() => {
    if (!boards || !boards.length) return;
    const boardsWithWorkspace = boards
      .map((b) => (b as unknown as { workspace?: Workspace | string }).workspace)
      .filter(Boolean)
      .map((w) => (typeof w === 'string' ? { _id: w, name: 'Không tên' } as Workspace : (w as Workspace)));

    if (!boardsWithWorkspace.length) return;

    setWorkspaces((current) => {
      const existingIds = new Set(current.map((w) => String(w._id)));
      const toAdd: Workspace[] = [];
      for (const w of boardsWithWorkspace) {
        if (w && w._id && !existingIds.has(String(w._id))) {
          toAdd.push({ _id: String(w._id), name: w.name || 'Không tên' });
          existingIds.add(String(w._id));
        }
      }
      
      // Only auto-select if nothing is currently selected
      if (toAdd.length && !selectedWorkspaceId) {
        setSelectedWorkspaceId(toAdd[0]._id);
      }
      
      return toAdd.length ? [...current, ...toAdd] : current;
    });
  }, [boards, selectedWorkspaceId]);


  const onCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submittingRef.current) return;
    if (title.trim().length < 2) {
      toast.error('Tiêu đề phải có ít nhất 2 ký tự');
      return;
    }
    try {
      submittingRef.current = true;
      const created = await addBoard({ title: title.trim(), description: description.trim(), workspace: selectedWorkspaceId ?? undefined });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      if (created && created._id) {
        navigate(`/board/${created._id}`);
      }
    } catch (err) {
      console.error('create board error', err);
    } finally {
      submittingRef.current = false;
    }
  };



  const openEdit = (b: Board) => {
    setEditId(b._id);
    setEditTitle(b.title || '');
    setEditDescription(b.description || '');
    setShowEdit(true);
  };

  const onEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editId) return;
    if (editingRef.current) return;
    if (editTitle.trim().length < 2) {
      toast.error('Tiêu đề phải có ít nhất 2 ký tự');
      return;
    }
    try {
      editingRef.current = true;
      await useBoardStore.getState().updateBoard(editId, { title: editTitle.trim(), description: editDescription.trim() });
      setShowEdit(false);
      setEditId(null);
    } catch (err) {
      console.error('edit board error', err);
    } finally {
      editingRef.current = false;
    }
  };

  const onDelete = async (id: string) => {
    setDeletingBoardId(id);
    setShowDeleteBoardConfirm(true);
  };

  const confirmDeleteBoard = async () => {
    if (!deletingBoardId) return;
    try {
      await useBoardStore.getState().removeBoard(deletingBoardId);
      setShowDeleteBoardConfirm(false);
      setDeletingBoardId(null);
    } catch (err) {
      console.error('delete board error', err);
      toast.error('Xóa bảng thất bại');
    }
  };

  const handleDeleteWorkspace = async (e: React.MouseEvent, ws: Workspace) => {
    e.stopPropagation();
    setDeletingWorkspace(ws);
    setConfirmWorkspaceName('');
    setShowDeleteWorkspaceConfirm(true);
  };

  const confirmDeleteWorkspace = async () => {
    if (!deletingWorkspace) return;
    
    // Validate workspace name confirmation
    if (confirmWorkspaceName.trim() !== deletingWorkspace.name.trim()) {
      toast.error('Tên không gian không khớp. Vui lòng nhập chính xác để xác nhận.');
      return;
    }

    try {
      await api.delete(`/workspaces/${deletingWorkspace._id}`, {
        data: { confirmName: confirmWorkspaceName.trim() }
      });
      setWorkspaces((cur) => cur.filter((w) => w._id !== deletingWorkspace._id));

      if (selectedWorkspaceId === deletingWorkspace._id) {
        const left = workspaces.filter((x) => x._id !== deletingWorkspace._id);
        setSelectedWorkspaceId(left[0]?._id ?? null);
      }
      setShowDeleteWorkspaceConfirm(false);
      setDeletingWorkspace(null);
      setConfirmWorkspaceName('');
      toast.success('Xóa không gian thành công');
    } catch (err: unknown) {
      console.error('delete workspace error', err);
      let errorMsg = 'Xóa không thành công';
      if (typeof err === 'object' && err && 'response' in err) {
        const resp = (err as { response?: { data?: { message?: string } } }).response;
        errorMsg = resp?.data?.message ?? errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-purple overflow-hidden">
      {/* Sidebar với Gradient Sky-Pastel */}
      <aside className={`glass-strong border-r border-[hsl(var(--border))] flex flex-col shadow-glow relative overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'w-0' : 'w-72'
      }`}>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-[hsl(200,100%,75%)] via-[hsl(195,100%,85%)] to-[hsl(190,100%,88%)] opacity-20 pointer-events-none"></div>
        <div className={`relative z-10 flex flex-col h-full p-5 transition-opacity duration-300 ${
          sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Logo Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-chat flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-[hsl(var(--primary-foreground))]" />
              </div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-[hsl(200,100%,60%)] to-[hsl(190,100%,70%)] bg-clip-text text-transparent">
                Kanban X
              </h1>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-linear-to-br from-[hsl(200,100%,75%)]/20 to-[hsl(195,100%,85%)]/10 p-3 rounded-xl border border-[hsl(var(--primary))]/20">
                <Layout className="w-4 h-4 text-[hsl(var(--primary))] mb-1" />
                <p className="text-xs font-medium text-foreground/70 dark:text-foreground/80">{t('board.title')}</p>
                <p className="text-lg font-bold text-foreground dark:text-foreground">{boards.length}</p>
              </div>
              <div className="bg-linear-to-br from-[hsl(200,100%,75%)]/20 to-[hsl(195,100%,85%)]/10 p-3 rounded-xl border border-[hsl(var(--primary))]/20">
                <Users className="w-4 h-4 text-[hsl(var(--primary))] mb-1" />
                <p className="text-xs font-medium text-foreground/70 dark:text-foreground/80">{t('workspace.title')}</p>
                <p className="text-lg font-bold text-foreground dark:text-foreground">{workspaces.length}</p>
              </div>
            </div>
          </div>

          {/* Workspaces */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-foreground/60 dark:text-foreground/70 text-xs font-semibold uppercase tracking-wider">
                {t('workspace.title')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateWorkspace(true)}
                className="h-7 px-2 text-primary hover:bg-primary/10 rounded-lg">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {workspaces.length > 0 ? (
                workspaces.map((ws) => {
                  const expanded = expandedWorkspaceIds.includes(String(ws._id));
                  const isActive = ws._id === selectedWorkspaceId;
                  // Check if current user is owner of this workspace
                  const isWorkspaceOwner = user?._id && ws.owner && String(user._id) === String(ws.owner);
                  
                  return (
                    <div key={ws._id} className="group rounded-lg overflow-hidden">
                      {/* Workspace Header */}
                      <div 
                        className={`flex items-center gap-2 p-2.5 cursor-pointer transition-all duration-200 ${
                          isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <button
                          className="h-6 w-6 shrink-0 rounded hover:bg-muted flex items-center justify-center transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWorkspaceIds((prev) => 
                              expanded ? prev.filter(id => id !== String(ws._id)) : [...prev, String(ws._id)]
                            );
                          }}
                          aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm transition-all duration-200 hover:scale-105 bg-gradient-chat"
                          onClick={() => navigate(`/workspace/${ws._id}`)}
                        >
                          <span className="text-primary-foreground">{(ws.name?.[0] || 'W').toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingWorkspaceId === ws._id ? (
                            <input
                              ref={editingInputRef}
                              type="text"
                              value={editingWorkspaceName}
                              onChange={(e) => setEditingWorkspaceName(e.target.value)}
                              onBlur={async () => {
                                if (editingWorkspaceName.trim() && editingWorkspaceName.trim() !== ws.name) {
                                  try {
                                    await api.put(`/workspaces/${ws._id}`, { name: editingWorkspaceName.trim() });
                                    setWorkspaces(prev => prev.map(w => 
                                      w._id === ws._id ? { ...w, name: editingWorkspaceName.trim() } : w
                                    ));
                                    toast.success('Đã cập nhật tên workspace');
                                  } catch (err) {
                                    console.error('Update workspace name error', err);
                                    toast.error('Cập nhật tên thất bại');
                                  }
                                }
                                setEditingWorkspaceId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingWorkspaceId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 text-sm font-medium bg-muted border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              autoFocus
                            />
                          ) : (
                            <p 
                              className="font-semibold truncate text-foreground dark:text-white text-sm hover:text-primary dark:hover:text-primary transition-colors duration-200 cursor-pointer"
                              onClick={() => navigate(`/workspace/${ws._id}`)}
                              onDoubleClick={(e) => {
                                if (isWorkspaceOwner) {
                                  e.stopPropagation();
                                  setEditingWorkspaceId(ws._id);
                                  setEditingWorkspaceName(ws.name || '');
                                }
                              }}
                            >
                              {ws.name}
                            </p>
                          )}
                        </div>
                        {/* Only show edit/delete buttons for workspace owner */}
                        {isWorkspaceOwner && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              className="h-6 w-6 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditWorkspaceId(ws._id);
                                setEditWorkspaceName(ws.name || '');
                                setShowEditWorkspace(true);
                              }}
                              aria-label="Chỉnh sửa"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              className="h-6 w-6 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all duration-200"
                              onClick={async (e) => handleDeleteWorkspace(e, ws)}
                              aria-label="Xóa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Collapsible Submenu */}
                      {expanded && (
                        <div className={`space-y-1 px-2 pb-2 ${
                          isActive ? 'bg-primary/5' : ''
                        }`}>
                          <button
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                            }`}
                            onClick={() => navigate(`/workspace/${ws._id}`)}
                          >
                            <Layout className="w-4 h-4" />
                            <span >{t('board.title')}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground transition-colors"
                              onClick={() => {
                                setSelectedWorkspaceForMembers(ws);
                                setShowMembersModal(true);
                              }}
                            >
                              <Users className="w-4 h-4" />
                              <span>{t('board.members')}  </span>
                              {ws.members && ws.members.length > 0 && (
                                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {ws.members.length}
                                </span>
                              )}
                            </button>
                            {/* Only show add member button for workspace owner */}
                            {isWorkspaceOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspaceForMembers(ws);
                                  setShowMembersModal(true);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                         
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center bg-muted rounded-xl border-2 border-dashed border-border">
                  <Layout className="w-8 h-8 text-gray-500 dark:text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {t('workspace.noWorkspaces')}
                  </p>
                  <Button 
                    onClick={() => setShowCreateWorkspace(true)} 
                    className="w-full bg-gradient-chat text-primary-foreground shadow-soft"
                  >
                    {t('workspace.createNewWorkspace')}
                  </Button>
                </div>
              )}
            </div>
          </div>


          {/* Profile Section - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pt-6 pb-5 px-5 border-t border-[hsl(var(--border))]">
            <div
              className="relative flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-linear-to-r from-[hsl(200,100%,75%)]/20 to-[hsl(195,100%,85%)]/10 hover:from-[hsl(200,100%,75%)]/30 hover:to-[hsl(195,100%,85%)]/20 transition-all duration-300 border border-[hsl(var(--primary))]/20"
              onClick={() => navigate("/profile")}
              onMouseEnter={() => setShowSidebarPreview(true)}
              onMouseLeave={() => setShowSidebarPreview(false)}
            >
              <Avatar className="ring-2 ring-[hsl(var(--primary))]/30">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} />
                ) : (
                  <AvatarFallback className="bg-gradient-chat text-[hsl(var(--primary-foreground))]">
                    {user?.username?.[0] || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.username || "Người dùng"}
                </p>
                
              </div>

              {showSidebarPreview && (
                <div className="absolute left-full top-0 ml-3 z-50">
                  <div className="glass-strong text-sm p-4 rounded-xl shadow-glow border border-[hsl(var(--border))]">
                    <div className="font-semibold text-primary-strong">{user?.displayName || user?.username}</div>
                    <div className="text-xs text-muted-strong mt-1">{user?.email}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-chat text-primary-foreground shadow-glow hover:shadow-[0_0_40px_hsl(200_100%_70%/0.4)] transition-all duration-300 p-2 rounded-r-xl"
        style={{ left: sidebarCollapsed ? '0' : '288px' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 sm:pt-0">
        {/* Header với Gradient - Fixed on mobile */}
        <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-50 sm:static glass-strong border-b border-[hsl(var(--border))] px-4 sm:px-8 py-3 sm:py-5 shadow-soft backdrop-blur-xl">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-4 flex-shrink min-w-0">
              <div className="min-w-0 flex-shrink">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white mb-1 truncate max-w-[200px] lg:max-w-md">
                  {workspaces.find(w => w._id === selectedWorkspaceId)?.name || 'Không gian làm việc'}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <Input
                  value={searchText}
                  onChange={handleChange}
                  placeholder={t('dashboard.searchBoards')}
                  className="w-80 pl-11 h-11 glass border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-all duration-200 rounded-xl"
                />
              </div>
              {/* Mobile-only search icon */}
              <button
                type="button"
                className="sm:hidden h-10 w-10 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                onClick={() => setShowMobileSearch((s) => !s)}
                aria-label="Tìm kiếm"
              >
                <Search className="w-5 h-5" />
              </button>
              
              <Button 
                onClick={() => setShowCreate(true)} 
                className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] transition-all duration-300 h-11 px-6 rounded-xl font-semibold"
              >
                <Plus className="w-5 h-5 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">{t('board.createBoard')}</span>
              </Button>
              
             
              
              <SimpleThemeToggle />
              <LanguageSwitcher />
              <NotificationPanel />
               <div
                className="cursor-pointer relative"
                onClick={() => navigate("/profile")}
                onMouseEnter={() => setShowHeaderPreview(true)}
                onMouseLeave={() => setShowHeaderPreview(false)}
              >
                <Avatar className="w-11 h-11 ring-2 ring-[hsl(var(--primary))]/30 hover:ring-[hsl(var(--primary))]/60 transition-all duration-200">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} />
                  ) : (
                    <AvatarFallback className="bg-gradient-chat text-[hsl(var(--primary-foreground))]">
                      {(user?.displayName?.[0] || user?.username?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                {showHeaderPreview && (
                  <div className="absolute right-0 mt-3 z-50">
                    <div className="glass-strong text-sm p-4 rounded-xl shadow-glow border border-[hsl(var(--border))]">
                      <div className="font-semibold text-[hsl(var(--foreground))]">{user?.displayName || user?.username}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{user?.email}</div>
                    </div>
                  </div>
                )}
              </div>
              {/* Mobile search panel anchored under header */}
              {showMobileSearch && (
                <div className="sm:hidden absolute left-0 right-0 top-full p-3 bg-background border-t border-[hsl(var(--border))] z-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      value={searchText}
                      onChange={handleChange}
                      placeholder={t('dashboard.searchBoards')}
                      className="w-full pl-11 h-11 glass border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 transition-all duration-200 rounded-xl"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded flex items-center justify-center hover:bg-muted"
                      onClick={() => setShowMobileSearch(false)}
                      aria-label={t('dashboard.closeSearch')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
           
            </div>
          </div>
        </header>

        {/* Board Grid - Scrollable */}
        <section className="flex-1 overflow-y-auto p-8">
          {/* Upcoming Cards Widget */}
          <div className="mb-8">
            <UpcomingCardsWidget />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-foreground dark:text-black flex items-center gap-3">
              <Layout className="w-6 h-6 text-primary dark:text-primary" />
              {t('board.yourBoards')}
              <span className="text-base text-foreground/70 dark:text-foreground/80 font-normal bg-muted dark:bg-muted px-3 py-1 rounded-full">
                {boards.length}
              </span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-strong rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
                  <div className="h-40 p-3">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex -space-x-2 items-center">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="w-7 h-7 rounded-full" />
                        <Skeleton className="w-7 h-7 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              ))
            ) : boards.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-20">
                <div className="text-center">
                  <Layout className="w-20 h-20 text-[hsl(var(--muted-foreground))] mx-auto mb-4 opacity-50" />
                  <p className="text-foreground dark:text-white font-medium mb-2">{t('board.noBoards')}</p>
                  <p className="text-foreground/70 dark:text-foreground/80 text-sm mb-4">{t('board.createFirstBoard')}</p>
                  <Button onClick={() => setShowCreate(true)} className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('board.createBoard')}
                  </Button>
                </div>
              </div>
            ) : (
              boards.map((b: Board, index: number) => {
                // Check if current user is owner of this board
                const ownerObj = (b.owner && typeof b.owner === 'object') ? (b.owner as { _id?: string }) : undefined;
                const ownerId = ownerObj?._id || (typeof b.owner === 'string' ? b.owner : undefined);
                const isOwner = user?._id && ownerId && String(user._id) === String(ownerId);

                // Check if user is member of the workspace (has edit rights)
                const boardWorkspace = (b as unknown as { workspace?: Workspace | string }).workspace;
                const workspaceId = typeof boardWorkspace === 'string' ? boardWorkspace : boardWorkspace?._id;
                const workspace = workspaces.find(ws => String(ws._id) === String(workspaceId));
                const isWorkspaceMember = workspace && user?._id && (
                  // User is workspace owner
                  (workspace.owner && String(workspace.owner) === String(user._id)) ||
                  // User is in workspace members list
                  (workspace.members || []).some(m => {
                    const memberId = typeof m === 'string' ? m : m._id;
                    return String(memberId) === String(user._id);
                  })
                );
                const canEdit = isOwner || isWorkspaceMember;

                return (
                  <div
                    key={b._id}
                    onClick={() => navigate(`/board/${b._id}`)}
                    className="group relative glass-strong rounded-2xl overflow-hidden shadow-soft hover:shadow-glow transition-all duration-300 cursor-pointer border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] message-bounce hover:-translate-y-1"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Gradient Overlay on Image */}
                    <div className="h-40 bg-cover bg-center relative overflow-hidden" style={b.background ? getBackgroundStyle(b.background) : { backgroundImage: `url(${b.image || '/img/default-board.jpg'})` }}>
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent"></div>
                      <div className="absolute inset-0 bg-linear-to-br from-[hsl(200,100%,75%)]/20 to-[hsl(195,100%,85%)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Owner Badge */}
                      {isOwner && (
                        <div className="absolute top-3 left-3 z-10">
                          <div className="px-3 py-1.5 bg-gradient-chat text-[hsl(var(--primary-foreground))] text-xs font-bold rounded-lg shadow-glow flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Owner
                          </div>
                        </div>
                      )}
                      
                      {/* Actions - Show for owner or workspace members */}
                      {canEdit && (
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-lg shadow-soft border border-gray-200 dark:border-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(b);
                            }}
                          >
                            <Edit2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/90 dark:bg-gray-800/90 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg shadow-soft border border-gray-200 dark:border-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(b._id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-[hsl(var(--destructive))]" />
                          </Button>
                        </div>
                      )}

                    {/* Star Badge */}
                    <div className="absolute bottom-3 left-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-lg shadow-soft border border-gray-200 dark:border-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h4 className="text-base font-bold text-foreground dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200 mb-2 line-clamp-1">
                      {b.title}
                    </h4>
                    {b.description && (
                      <p className="text-sm text-foreground/70 dark:text-foreground/80 line-clamp-2 mb-3">
                        {b.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex -space-x-2 items-center">
                          {/* owner avatar (distinct) */}
                          {(() => {
                            const ownerObj = (b.owner && typeof b.owner === 'object') ? (b.owner as { _id?: string; avatarUrl?: string; displayName?: string; username?: string }) : undefined;
                            const ownerId = !ownerObj && b.owner ? String(b.owner) : ownerObj?._id;
                            if (ownerObj || ownerId) {
                              const avatarUrl = ownerObj?.avatarUrl || null;
                              const name = ownerObj?.displayName || ownerObj?.username || (ownerId ? ownerId : 'Owner');
                              const initials = name ? name.split(' ').map((p: string) => p[0]).slice(0,2).join('') : (ownerId ? String(ownerId).slice(0,2) : 'O');
                              return (
                                <div key={String(ownerId || 'owner')} title={`Owner: ${name}`} className="w-8 h-8 rounded-full ring-2 ring-[hsl(var(--primary))] overflow-hidden border-2 border-white bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold text-white">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[11px]">{String(initials).toUpperCase()}</span>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* members (exclude owner if duplicated) */}
                          {((b.members || []) as (string | { _id?: string; avatarUrl?: string; displayName?: string; username?: string; photoUrl?: string })[])
                            .filter((m) => {
                              const mId = typeof m === 'string' ? m : (m && (m._id || ''));
                              const ownerObj = (b.owner && typeof b.owner === 'object') ? (b.owner as { _id?: string }) : undefined;
                              const ownerId = ownerObj ? ownerObj._id : (typeof b.owner === 'string' ? b.owner : undefined);
                              return !ownerId || String(mId) !== String(ownerId);
                            })
                            .slice(0, 4)
                            .map((m, i) => {
                              const memberObj = (typeof m === 'string' ? { _id: m } : m || {}) as { _id?: string; avatarUrl?: string; photoUrl?: string; displayName?: string; username?: string };
                              const key = (memberObj && (memberObj._id)) || `m-${i}`;
                              const avatarUrl = memberObj.avatarUrl || memberObj.photoUrl || null;
                              const name = memberObj.displayName || memberObj.username || '';
                              const initials = name ? name.split(' ').map((p: string) => p[0]).slice(0,2).join('') : (memberObj._id ? String(memberObj._id).slice(0,2) : 'U');
                              return (
                                <div key={String(key)} title={name || String(key)} className="w-7 h-7 rounded-full ring-2 ring-white overflow-hidden border-2 border-white bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold text-white">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={name || 'Member'} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px]">{String(initials).toUpperCase()}</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>

                      <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1" title={b.createdAt ? formatFullDateTime(b.createdAt) : ''}>
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(b.createdAt || '')}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Gradient Bar */}
                  <div className="h-1 bg-gradient-chat opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Create Board Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <form onSubmit={onCreate} className="relative w-full max-w-2xl glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                  <Plus className="w-6 h-6 text-[hsl(var(--primary-foreground))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    Tạo bảng mới
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    {t('board.manageWork')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-5 mb-6">
              <div className="p-5 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Thông tin bảng</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] block mb-2">
                      Tiêu đề bảng <span className="text-destructive">*</span>
                    </label>
                    <Input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Ví dụ: Roadmap Q4, Sprint Planning..." 
                      className="w-full bg-[hsl(var(--background))] border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 h-12 rounded-xl text-base"
                      autoFocus
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      Tiêu đề phải có ít nhất 2 ký tự
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] block mb-2">
                      Mô tả (tùy chọn)
                    </label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      className="w-full p-4 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:outline-none text-[hsl(var(--foreground))] resize-none" 
                      rows={4}
                      placeholder="Thêm mô tả chi tiết về mục đích, phạm vi của bảng..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreate(false)} 
                type="button"
                className="hover:bg-[hsl(var(--muted))] rounded-xl px-6 h-11"
              >
                Hủy
              </Button>
              <Button 
                type="submit"
                disabled={title.trim().length < 2}
                className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] px-8 rounded-xl h-11 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t('board.createBoard')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateWorkspace(false)} />
          <form onSubmit={onCreateWorkspace} className="relative w-full max-w-md glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-chat flex items-center justify-center">
                <Plus className="w-5 h-5 text-[hsl(var(--primary-foreground))]" />
              </div>
              {t('workspace.createWorkspace')}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[hsl(var(--foreground))] block mb-2">{t('workspace.workspaceName')}</label>
                <Input 
                  value={newWorkspaceName} 
                  onChange={(e) => setNewWorkspaceName(e.target.value)} 
                  placeholder="Ví dụ: Công việc" 
                  className="glass border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateWorkspace(false)} 
                type="button"
                className="hover:bg-[hsl(var(--muted))] rounded-xl px-6"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] px-8 rounded-xl"
              >
                {t('workspace.createNewWorkspace')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEdit && editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <form onSubmit={onEditSubmit} className="relative w-full max-w-lg glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-chat flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-[hsl(var(--primary-foreground))]" />
              </div>
              Chỉnh sửa bảng
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[hsl(var(--foreground))] block mb-2">Tiêu đề</label>
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="Tiêu đề bảng" 
                  className="glass border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[hsl(var(--foreground))] block mb-2">Mô tả (tùy chọn)</label>
                <textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                  className="w-full p-4 glass border border-[hsl(var(--border))] rounded-xl focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:outline-none text-[hsl(var(--foreground))]" 
                  rows={4}
                  placeholder="Mô tả chi tiết về bảng..."
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowEdit(false)} 
                type="button"
                className="hover:bg-[hsl(var(--muted))] rounded-xl px-6"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] px-8 rounded-xl"
              >
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {showEditWorkspace && editWorkspaceId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditWorkspace(false)} />
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (editingWorkspaceRef.current) return;
              if (!editWorkspaceName.trim() || editWorkspaceName.trim().length < 2) {
                toast.error('Tên không gian phải có ít nhất 2 ký tự');
                return;
              }
              try {
                editingWorkspaceRef.current = true;
                await api.put(`/workspaces/${editWorkspaceId}`, { name: editWorkspaceName.trim() });
                setWorkspaces((cur) => cur.map((w) => w._id === editWorkspaceId ? { ...w, name: editWorkspaceName.trim() } : w));
                setShowEditWorkspace(false);
                setEditWorkspaceId(null);
                toast.success('Cập nhật không gian thành công');
              } catch (err) {
                console.error('edit workspace error', err);
                toast.error('Cập nhật không thành công');
              } finally {
                editingWorkspaceRef.current = false;
              }
            }}
            className="relative w-full max-w-lg glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-chat flex items-center justify-center shadow-soft">
                  <Edit2 className="w-6 h-6 text-[hsl(var(--primary-foreground))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {t('workspace.editWorkspace')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    {t('workspace.updateInfo')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditWorkspace(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-5 mb-6">
              <div className="p-5 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Thông tin cơ bản</h4>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] block mb-2">
                    {t('workspace.workspaceName')} <span className="text-destructive">*</span>
                  </label>
                  <Input 
                    value={editWorkspaceName} 
                    onChange={(e) => setEditWorkspaceName(e.target.value)} 
                    placeholder="Ví dụ: Dự án công ty, Học tập..." 
                    className="w-full bg-[hsl(var(--background))] border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 h-12 rounded-xl text-base"
                    autoFocus
                  />
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Tên phải có ít nhất 2 ký tự
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <Button 
                variant="ghost" 
                onClick={() => setShowEditWorkspace(false)} 
                type="button"
                className="hover:bg-[hsl(var(--muted))] rounded-xl px-6 h-11"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={!editWorkspaceName.trim() || editWorkspaceName.trim().length < 2}
                className="bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] px-8 rounded-xl h-11 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Board Confirmation Modal */}
      {showDeleteBoardConfirm && deletingBoardId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteBoardConfirm(false)} />
          <div className="relative w-full max-w-md glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-3 text-center">
              Xác nhận xóa bảng
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
              Bạn có chắc chắn muốn xóa bảng này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowDeleteBoardConfirm(false);
                  setDeletingBoardId(null);
                }}
                className="hover:bg-[hsl(var(--muted))] rounded-xl px-6"
              >
                Hủy
              </Button>
              <Button 
                onClick={confirmDeleteBoard}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-8 rounded-xl"
              >
                Xóa bảng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteWorkspaceConfirm && deletingWorkspace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
            setShowDeleteWorkspaceConfirm(false);
            setConfirmWorkspaceName('');
          }} />
          <div className="relative w-full max-w-md glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300">
            <button
              onClick={() => {
                setShowDeleteWorkspaceConfirm(false);
                setDeletingWorkspace(null);
                setConfirmWorkspaceName('');
              }}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              ✕
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-3 text-center">
              Xóa Không gian làm việc?
            </h3>
            
            <div className="mb-6 text-left">
              <p className="text-base font-semibold text-[hsl(var(--foreground))] mb-3">
                Nhập tên Không gian "<span className="text-destructive">{deletingWorkspace.name}</span>" để xóa
              </p>
              
              <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <p className="font-semibold">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Hành động này là vĩnh viễn và không thể hoàn tác.</li>
                  <li><strong>Tất cả bảng trong Không gian này sẽ bị xóa.</strong></li>
                </ul>
              </div>
              
              <div className="mt-4">
                <label className="text-sm font-medium text-[hsl(var(--foreground))] block mb-2">
                  Nhập tên Không gian để xóa
                </label>
                <Input
                  type="text"
                  value={confirmWorkspaceName}
                  onChange={(e) => setConfirmWorkspaceName(e.target.value)}
                  placeholder={deletingWorkspace.name}
                  className="w-full bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                  autoFocus
                />
              </div>
            </div>
            
            <Button 
              onClick={confirmDeleteWorkspace}
              disabled={confirmWorkspaceName.trim() !== deletingWorkspace.name.trim()}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed px-8 rounded-xl"
            >
              Xóa Không gian
            </Button>
          </div>
        </div>
      )}
      
      {/* Members Modal */}
      {showMembersModal && selectedWorkspaceForMembers && (() => {
        // Check if current user is owner of the workspace
        const isModalWorkspaceOwner = user?._id && selectedWorkspaceForMembers.owner && 
          String(user._id) === String(selectedWorkspaceForMembers.owner);

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
              setShowMembersModal(false);
              setSelectedWorkspaceForMembers(null);
              setMemberEmail('');
            }} />
            <div className="relative w-full max-w-2xl glass-strong p-8 rounded-2xl shadow-glow border border-[hsl(var(--border))] z-60 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-chat flex items-center justify-center shadow-soft">
                    <Users className="w-6 h-6 text-[hsl(var(--primary-foreground))]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                      {t('workspace.manageMembers')}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                      {selectedWorkspaceForMembers.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedWorkspaceForMembers(null);
                    setMemberEmail('');
                  }}
                  className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {/* Add member form - only show for owner */}
                {isModalWorkspaceOwner && (
                  <div className="mb-6 p-5 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{t('workspace.inviteMember')}</h4>
                    </div>
                  <form onSubmit={async (e) => {
                e.preventDefault();
                if (!memberEmail.trim()) {
                  toast.error('Vui lòng nhập email');
                  return;
                }

                try {
                  // Find user by email
                  const userRes = await api.get(`/users/find?email=${encodeURIComponent(memberEmail.trim())}`);
                  const foundUser = userRes.data.user;

                  if (!foundUser || !foundUser._id) {
                    toast.error('Không tìm thấy người dùng với email này');
                    return;
                  }

                  // Check if already member
                  const currentMembers = (selectedWorkspaceForMembers.members || []).map(m => 
                    typeof m === 'string' ? m : m._id
                  );
                  
                  if (currentMembers.includes(foundUser._id)) {
                    toast.error('Người dùng đã là thành viên');
                    return;
                  }

                  // Add member (send IDs to API)
                  const updatedMemberIds = [...currentMembers, foundUser._id];
                  await api.put(`/workspaces/${selectedWorkspaceForMembers._id}`, {
                    members: updatedMemberIds
                  });

                  // Build UI-friendly member list with full objects
                  const prevMembers = selectedWorkspaceForMembers.members || [];
                  const updatedMembersUI = [
                    ...prevMembers,
                    {
                      _id: String(foundUser._id),
                      email: foundUser.email,
                      username: foundUser.username,
                      displayName: foundUser.displayName,
                      avatarUrl: foundUser.avatarUrl,
                    }
                  ];

                  // Update local state with rich member data
                  setWorkspaces(prev => prev.map(ws => 
                    ws._id === selectedWorkspaceForMembers._id 
                      ? { ...ws, members: updatedMembersUI }
                      : ws
                  ));
                  
                  setSelectedWorkspaceForMembers(prev => 
                    prev ? { ...prev, members: updatedMembersUI } : null
                  );

                  setMemberEmail('');
                  toast.success(`Đã thêm ${foundUser.email} vào workspace`);
                } catch (err: unknown) {
                  console.error('Add member error', err);
                  const error = err as { response?: { status?: number } };
                  if (error.response?.status === 404) {
                    toast.error('Không tìm thấy người dùng');
                  } else {
                    toast.error('Thêm thành viên thất bại');
                  }
                }
              }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] block mb-2">{t('workspace.emailMembers')}</label>
                      <Input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full bg-[hsl(var(--background))] border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary))]/30 h-11 rounded-xl"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-chat text-[hsl(var(--primary-foreground))] shadow-glow hover:shadow-[0_0_60px_hsl(200_100%_70%/0.4)] h-11 rounded-xl font-semibold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {t('common.send')}
                    </Button>
                  </form>
                </div>
                )}

                {/* Current members list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {t('workspace.workspaceMembers')} ({(selectedWorkspaceForMembers.members || []).length})
                      </h4>
                    </div>
                  </div>
                  {(selectedWorkspaceForMembers.members || []).length === 0 ? (
                    <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="font-medium mb-1">Chưa có thành viên nào</p>
                      <p className="text-xs">Mời người khác để bắt đầu cộng tác</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                  {(selectedWorkspaceForMembers.members || []).map((member, idx) => {
                    const memberId = typeof member === 'string' ? member : member._id;
                    const memberEmail = typeof member === 'object' && member.email ? member.email : '';
                    const memberName = typeof member === 'object' && (member.displayName || member.username) 
                      ? (member.displayName || member.username) 
                      : memberEmail || memberId;
                    const avatarUrl = typeof member === 'object' && member.avatarUrl ? member.avatarUrl : null;

                    return (
                      <div key={memberId || idx} className="flex items-center justify-between p-4 bg-[hsl(var(--muted))]/20 hover:bg-[hsl(var(--muted))]/40 rounded-xl border border-[hsl(var(--border))]/50 hover:border-[hsl(var(--border))] transition-all group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-11 h-11 ring-2 ring-[hsl(var(--border))] group-hover:ring-primary/30 transition-all">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={memberName} />
                            ) : (
                              <AvatarFallback className="bg-gradient-chat text-[hsl(var(--primary-foreground))]">
                                {(memberName && memberName[0]?.toUpperCase()) || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[hsl(var(--foreground))] truncate">{memberName}</p>
                            {memberEmail && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">{memberEmail}</p>}
                          </div>
                        </div>
                        {/* Only show remove button for workspace owner */}
                        {isModalWorkspaceOwner && (
                          <button
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-destructive transition-all shrink-0"
                            onClick={async () => {
                              try {
                                const updatedMembers = (selectedWorkspaceForMembers.members || [])
                                  .map(m => typeof m === 'string' ? m : m._id)
                                  .filter(id => id !== memberId);

                                await api.put(`/workspaces/${selectedWorkspaceForMembers._id}`, {
                                  members: updatedMembers
                                });

                                setWorkspaces(prev => prev.map(ws => 
                                  ws._id === selectedWorkspaceForMembers._id 
                                    ? { ...ws, members: updatedMembers }
                                    : ws
                                ));

                                setSelectedWorkspaceForMembers(prev => 
                                  prev ? { ...prev, members: updatedMembers } : null
                                );

                                toast.success('Đã xóa thành viên');
                              } catch (err) {
                                console.error('Remove member error', err);
                                toast.error('Xóa thành viên thất bại');
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

              <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] flex justify-between items-center">
                {/* Leave workspace button for members (not owner) */}
                {!isModalWorkspaceOwner && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        if (!user?._id) return;
                        
                        // Use new leave endpoint
                        await api.post(`/workspaces/${selectedWorkspaceForMembers._id}/leave`);

                        // Remove workspace from local state
                        setWorkspaces(prev => prev.filter(ws => ws._id !== selectedWorkspaceForMembers._id));

                        setShowMembersModal(false);
                        setSelectedWorkspaceForMembers(null);
                        toast.success('Đã rời khỏi workspace');
                        
                        // Navigate to first remaining workspace and refresh boards
                        const remainingWorkspaces = workspaces.filter(ws => ws._id !== selectedWorkspaceForMembers._id);
                        if (remainingWorkspaces.length > 0) {
                          setSelectedWorkspaceId(remainingWorkspaces[0]._id);
                          navigate(`/workspace/${remainingWorkspaces[0]._id}`);
                          // Refresh boards list
                          fetchBoards(remainingWorkspaces[0]._id, debouncedSearchText.trim() || undefined);
                        } else {
                          setSelectedWorkspaceId(null);
                          fetchBoards(undefined, debouncedSearchText.trim() || undefined);
                        }
                      } catch (err) {
                        console.error('Leave workspace error', err);
                        toast.error('Rời workspace thất bại');
                      }
                    }}
                    className="text-destructive hover:bg-destructive/10 rounded-xl px-6 h-10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Rời khỏi workspace
                  </Button>
                )}
                {isModalWorkspaceOwner && <div className="flex-1" />}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DashBoardPage;