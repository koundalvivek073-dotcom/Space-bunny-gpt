import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Cpu,
  PanelLeftClose,
  FileText,
  User as UserIcon,
  Sparkles,
  LogIn,
  LogOut,
  Cloud,
  Sun,
  Moon,
} from 'lucide-react';
import { Conversation } from '../types/chat';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import avatarImg from '../assets/images/avatar_space_bunny_1790312587845.jpg';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  currentUser: User | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
  currentModel: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface SearchMatch {
  conversation: Conversation;
  titleMatches: boolean;
  contentSnippet?: {
    role: 'user' | 'assistant';
    text: string;
    isReasoning?: boolean;
  };
}

const HighlightText: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-cyan-500/25 text-cyan-900 dark:text-cyan-200 px-0.5 py-0.2 rounded font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  currentUser,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onOpenSettings,
  isOpen,
  onToggleSidebar,
  currentModel,
  theme,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const isLight = theme === 'light';

  const searchResults = useMemo<SearchMatch[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchMatch[] = [];

    for (const conv of conversations) {
      const titleMatches = conv.title.toLowerCase().includes(q);
      let contentSnippet: SearchMatch['contentSnippet'] = undefined;

      for (let i = conv.messages.length - 1; i >= 0; i--) {
        const msg = conv.messages[i];
        const contentLower = msg.content.toLowerCase();
        const contentIdx = contentLower.indexOf(q);

        if (contentIdx !== -1) {
          const start = Math.max(0, contentIdx - 28);
          const end = Math.min(msg.content.length, contentIdx + q.length + 38);
          const prefix = start > 0 ? '…' : '';
          const suffix = end < msg.content.length ? '…' : '';
          const snippetText = `${prefix}${msg.content.slice(start, end).replace(/\r?\n|\r/g, ' ')}${suffix}`;

          contentSnippet = {
            role: msg.role === 'user' ? 'user' : 'assistant',
            text: snippetText,
            isReasoning: false,
          };
          break;
        }

        if (msg.reasoning) {
          const reasoningLower = msg.reasoning.toLowerCase();
          const rIdx = reasoningLower.indexOf(q);
          if (rIdx !== -1) {
            const start = Math.max(0, rIdx - 28);
            const end = Math.min(msg.reasoning.length, rIdx + q.length + 38);
            const prefix = start > 0 ? '…' : '';
            const suffix = end < msg.reasoning.length ? '…' : '';
            const snippetText = `${prefix}${msg.reasoning.slice(start, end).replace(/\r?\n|\r/g, ' ')}${suffix}`;

            contentSnippet = {
              role: 'assistant',
              text: snippetText,
              isReasoning: true,
            };
            break;
          }
        }
      }

      if (titleMatches || contentSnippet) {
        matches.push({
          conversation: conv,
          titleMatches,
          contentSnippet,
        });
      }
    }

    return matches;
  }, [conversations, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;

  const pinnedChats = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);

  const todayChats = unpinned.filter((c) => now - c.updatedAt < oneDayMs);
  const yesterdayChats = unpinned.filter(
    (c) => now - c.updatedAt >= oneDayMs && now - c.updatedAt < 2 * oneDayMs
  );
  const weekChats = unpinned.filter(
    (c) => now - c.updatedAt >= 2 * oneDayMs && now - c.updatedAt < sevenDaysMs
  );
  const olderChats = unpinned.filter((c) => now - c.updatedAt >= sevenDaysMs);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  const renderConversationItem = (
    chat: Conversation,
    matchInfo?: SearchMatch
  ) => {
    const isActive = chat.id === activeId;
    const isEditing = chat.id === editingId;

    return (
      <div
        key={chat.id}
        onClick={() => onSelectConversation(chat.id)}
        className={`group relative flex flex-col px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
          isActive
            ? isLight
              ? 'bg-sky-100/90 text-sky-900 shadow-xs border border-sky-200'
              : 'bg-neutral-800 text-neutral-100 shadow-xs border border-neutral-700/60'
            : isLight
            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
        }`}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => handleSaveRename(chat.id, e)}
            className="flex items-center gap-1.5 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className={`w-full px-2 py-1 rounded text-xs border focus:outline-hidden ${
                isLight
                  ? 'bg-white text-slate-900 border-sky-500'
                  : 'bg-neutral-950 text-white border-cyan-500'
              }`}
            />
            <button
              type="submit"
              className="p-1 text-emerald-500 hover:text-emerald-400"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="p-1 text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 truncate pr-2 min-w-0">
                <MessageSquare
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? (isLight ? 'text-sky-600' : 'text-cyan-400') : 'text-neutral-400'
                  }`}
                />
                <span className="truncate">
                  {isSearchActive ? (
                    <HighlightText text={chat.title} query={searchQuery} />
                  ) : (
                    chat.title
                  )}
                </span>
              </div>

              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  title={chat.pinned ? 'Unpin chat' : 'Pin chat'}
                  onClick={(e) => onTogglePinConversation(chat.id, e)}
                  className={`p-1 rounded transition-colors ${
                    chat.pinned
                      ? 'text-amber-500'
                      : isLight
                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  title="Rename title"
                  onClick={(e) => handleStartRename(chat, e)}
                  className={`p-1 rounded transition-colors ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  title="Delete chat"
                  onClick={(e) => onDeleteConversation(chat.id, e)}
                  className={`p-1 rounded hover:text-rose-500 transition-colors ${
                    isLight ? 'text-slate-400 hover:bg-slate-200' : 'text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {isSearchActive && matchInfo?.contentSnippet && (
              <div className={`mt-1.5 pl-6 pr-1 text-[11px] leading-snug break-words ${
                isLight ? 'text-slate-600' : 'text-neutral-400'
              }`}>
                <div className={`flex items-center gap-1 text-[10px] font-mono mb-0.5 ${
                  isLight ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  {matchInfo.contentSnippet.role === 'user' ? (
                    <>
                      <UserIcon className="w-2.5 h-2.5 text-slate-500 dark:text-neutral-400" />
                      <span>User prompt:</span>
                    </>
                  ) : matchInfo.contentSnippet.isReasoning ? (
                    <>
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span>Reasoning:</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Space Bunny response:</span>
                    </>
                  )}
                </div>
                <div className={`line-clamp-2 italic text-[11px] ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                  <HighlightText
                    text={matchInfo.contentSnippet.text}
                    query={searchQuery}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderGroup = (title: string, chats: Conversation[]) => {
    if (chats.length === 0) return null;
    return (
      <div className="mb-4">
        <div className={`px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase select-none ${
          isLight ? 'text-slate-400' : 'text-neutral-400'
        }`}>
          {title}
        </div>
        <div className="space-y-0.5">
          {chats.map((chat) => renderConversationItem(chat))}
        </div>
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onToggleSidebar}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 md:w-68 flex flex-col border-r transition-transform duration-200 ease-in-out ${
          isLight
            ? 'bg-slate-50/90 backdrop-blur-md border-slate-200/90 text-slate-800'
            : 'bg-neutral-950/85 backdrop-blur-md border-neutral-800/80 text-neutral-100'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between p-3.5 border-b ${
          isLight ? 'border-slate-200/90' : 'border-neutral-800/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <img
              src={avatarImg}
              alt="Space Bunny"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-cyan-500/30"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
                SpaceBunny
              </span>
              <span className="text-[10px] text-cyan-500 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Alpha 1M Context
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Toggle Button in Header */}
            <button
              onClick={onToggleTheme}
              title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4 text-amber-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors md:hidden"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Button: New Chat & Search Input */}
        <div className="p-3 space-y-2">
          <button
            onClick={onNewChat}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors shadow-xs group ${
              isLight
                ? 'bg-white hover:bg-slate-100/90 border-slate-200 text-slate-800'
                : 'bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
              New Chat
            </span>
            <kbd className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${
              isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-neutral-800 text-neutral-400'
            }`}>
              Ctrl+K
            </kbd>
          </button>

          {conversations.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search titles & content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    clearSearch();
                  }
                }}
                className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-[12px] placeholder-neutral-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all ${
                  isLight
                    ? 'bg-white/90 border-slate-200 text-slate-800'
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  title="Clear search (Esc)"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat History / Search Results List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-neutral-400 text-xs">
              <p>No conversations yet.</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Start a new chat to begin exploring with Space Bunny!
              </p>
            </div>
          ) : isSearchActive ? (
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold text-neutral-400 select-none">
                <span className="uppercase tracking-wider">
                  Search Results ({searchResults.length})
                </span>
                <button
                  onClick={clearSearch}
                  className="text-cyan-500 hover:text-cyan-600 font-normal hover:underline"
                >
                  Clear
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 px-4 text-neutral-400 text-xs space-y-2">
                  <p>
                    No matches found for &ldquo;<span className="font-medium text-neutral-300 dark:text-neutral-200">{searchQuery}</span>&rdquo;
                  </p>
                  <button
                    onClick={clearSearch}
                    className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors ${
                      isLight
                        ? 'bg-white border-slate-200 text-cyan-600 hover:bg-slate-50'
                        : 'bg-neutral-900 border-neutral-800 text-cyan-400 hover:bg-neutral-850'
                    }`}
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((match) =>
                    renderConversationItem(match.conversation, match)
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {renderGroup('Pinned', pinnedChats)}
              {renderGroup('Today', todayChats)}
              {renderGroup('Yesterday', yesterdayChats)}
              {renderGroup('Previous 7 Days', weekChats)}
              {renderGroup('Older', olderChats)}
            </>
          )}
        </div>

        {/* Bottom Auth, Profile & Settings */}
        <div className={`p-3 border-t space-y-1.5 ${
          isLight ? 'border-slate-200/90 bg-slate-50/90' : 'border-neutral-800/80 bg-neutral-950/80'
        }`}>
          {/* User Sign-In Banner */}
          {currentUser ? (
            <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2 truncate">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-cyan-500" />
                )}
                <div className="flex flex-col truncate">
                  <span className="truncate text-[11px] font-medium leading-none">
                    {currentUser.displayName || 'User'}
                  </span>
                  <span className="text-[10px] text-cyan-500 flex items-center gap-1 font-mono">
                    <Cloud className="w-2.5 h-2.5" /> Firestore Synced
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-neutral-800/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-sky-600'
                  : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-cyan-300'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}

          <div className="flex items-center justify-between px-2 py-1 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 truncate">
              <Cpu className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="truncate font-mono text-[11px]">
                {currentModel.split('/')[1] || currentModel}
              </span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isLight
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
            }`}>
              Ready
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isLight ? 'text-slate-700 hover:bg-slate-200/70' : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-neutral-400" />
              Settings & Model
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
