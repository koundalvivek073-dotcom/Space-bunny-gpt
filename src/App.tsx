import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  ChatMessage,
  AppSettings,
  DEFAULT_MODEL_ID,
} from './types/chat';
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  loadActiveConversationId,
  saveActiveConversationId,
  exportConversationToMarkdown,
  exportConversationToJSON,
} from './services/storage';
import { streamChatCompletion } from './services/openrouter';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { Extreme3DBackground } from './components/Extreme3DBackground';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveConversationId());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [selectedModel, setSelectedModel] = useState<string>(() => loadSettings().model || DEFAULT_MODEL_ID);

  // 3D background scroll effect tracking
  const [chatScrollY, setChatScrollY] = useState<number>(0);

  // Grounding states
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState<boolean>(false);

  // Streaming states
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingReasoning, setStreamingReasoning] = useState<string>('');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Apply dark / light class to root html element for Tailwind & CSS variables
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  // Toggle Theme helper
  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = settings.theme === 'light' ? 'dark' : 'light';
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    saveSettings(updated);
  };

  // Save conversations to frontend localStorage whenever they change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Save active conversation id to frontend localStorage
  useEffect(() => {
    saveActiveConversationId(activeId);
  }, [activeId]);

  // Keyboard shortcut for New Chat (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveId(id);
  };

  // Delete conversation
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(updated[0]?.id || null);
      }
      return updated;
    });
  };

  // Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, title: newTitle, updatedAt: Date.now() };
        }
        return c;
      })
    );
  };

  // Toggle pin conversation
  const handleTogglePinConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, pinned: !c.pinned };
        }
        return c;
      })
    );
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setSelectedModel(newSettings.model);
    saveSettings(newSettings);
  };

  // Clear all chats
  const handleClearAllChats = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setConversations([]);
    setActiveId(null);
    localStorage.removeItem('spacebunny_conversations_v1');
    localStorage.removeItem('spacebunny_active_chat_id');
  };

  // Export data
  const handleExportAllData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `spacebunny-all-chats-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Export current conversation as Markdown
  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    const md = exportConversationToMarkdown(activeConversation);
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `${activeConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Export current conversation as JSON
  const handleExportJSON = () => {
    if (!activeConversation) return;
    const json = exportConversationToJSON(activeConversation);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `${activeConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Import data
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setConversations((prev) => [...imported, ...prev]);
          if (imported[0]?.id) setActiveId(imported[0].id);
        } else if (imported.id && imported.messages) {
          setConversations((prev) => [imported, ...prev]);
          setActiveId(imported.id);
        }
      } catch (err) {
        alert('Failed to parse imported file. Please upload a valid JSON chat file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let targetConv = activeConversation;
    let isBrandNew = false;

    if (!targetConv) {
      isBrandNew = true;
      const initialTitle = text.slice(0, 32).trim() || 'New Chat';
      targetConv = {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: initialTitle,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
      };
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    let updatedTitle = targetConv.title;
    if (targetConv.title === 'New Chat' || isBrandNew) {
      updatedTitle = text.split('\n')[0].slice(0, 36).trim() || 'Chat with Space Bunny';
    }

    const updatedMessages = [...targetConv.messages, userMessage];

    const updatedConv: Conversation = {
      ...targetConv,
      title: updatedTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
      model: selectedModel,
    };

    if (isBrandNew) {
      setConversations((prev) => [updatedConv, ...prev]);
      setActiveId(updatedConv.id);
    } else {
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      );
    }

    // Default flow: Space Bunny Alpha on OpenRouter
    const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (settings.systemPrompt?.trim()) {
      apiMessages.push({ role: 'system', content: settings.systemPrompt.trim() });
    }
    for (const m of updatedMessages) {
      apiMessages.push({
        role: m.role,
        content: m.content,
      });
    }

    setIsStreaming(true);
    setStreamingReasoning('');
    setStreamingContent('');
    const reasoningStartTime = Date.now();
    let reasoningDuration = 0;
    let reasoningFinished = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    try {
      const result = await streamChatCompletion({
        model: selectedModel || DEFAULT_MODEL_ID,
        messages: apiMessages,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        signal: controller.signal,
        onChunk: ({ content, reasoning }) => {
          if (reasoning) {
            accumulatedReasoning += reasoning;
            setStreamingReasoning(accumulatedReasoning);
          }
          if (content) {
            if (!reasoningFinished && accumulatedReasoning) {
              reasoningFinished = true;
              reasoningDuration = Date.now() - reasoningStartTime;
            }
            accumulatedContent += content;
            setStreamingContent(accumulatedContent);
          }
        },
      });

      const finalAssistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: result.fullContent || accumulatedContent,
        reasoning: result.fullReasoning || accumulatedReasoning || undefined,
        reasoningDurationMs: reasoningDuration || (accumulatedReasoning ? Date.now() - reasoningStartTime : undefined),
        timestamp: Date.now(),
        model: selectedModel,
      };

      const finalConv = {
        ...updatedConv,
        messages: [...updatedConv.messages, finalAssistantMessage],
        updatedAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? finalConv : c))
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        if (accumulatedContent || accumulatedReasoning) {
          const abortedMsg: ChatMessage = {
            id: `msg_${Date.now()}_aborted`,
            role: 'assistant',
            content: accumulatedContent,
            reasoning: accumulatedReasoning || undefined,
            timestamp: Date.now(),
            model: selectedModel,
          };
          const finalConv = {
            ...updatedConv,
            messages: [...updatedConv.messages, abortedMsg],
            updatedAt: Date.now(),
          };
          setConversations((prev) =>
            prev.map((c) => (c.id === updatedConv.id ? finalConv : c))
          );
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          content: '',
          error: err.message || 'Failed to generate response.',
          timestamp: Date.now(),
          model: selectedModel,
        };
        const finalConv = {
          ...updatedConv,
          messages: [...updatedConv.messages, errorMsg],
          updatedAt: Date.now(),
        };
        setConversations((prev) =>
          prev.map((c) => (c.id === updatedConv.id ? finalConv : c))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingReasoning('');
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isStreaming) return;
    const msgs = [...activeConversation.messages];
    const lastMsg = msgs[msgs.length - 1];

    if (lastMsg.role === 'assistant') {
      const previousUserMsg = msgs[msgs.length - 2];
      if (previousUserMsg && previousUserMsg.role === 'user') {
        const trimmed = msgs.slice(0, msgs.length - 1);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: trimmed } : c))
        );
        handleSendMessage(previousUserMsg.content);
      }
    }
  };

  // Edit user prompt and branch
  const handleEditPrompt = (newText: string) => {
    if (!activeConversation || isStreaming) return;
    handleSendMessage(newText);
  };

  const isLight = settings.theme === 'light';

  return (
    <div
      className={`relative flex h-screen w-screen overflow-hidden font-sans transition-colors duration-500 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Extreme 3D Interactive WebGL Spatial Background with real-time scroll depth & output surge */}
      <Extreme3DBackground
        interactive={true}
        theme={settings.theme}
        scrollY={chatScrollY}
        isGenerating={isStreaming}
      />

      {/* Sidebar with Search & Local Chat History */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentModel={selectedModel}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Chat Area with TTS Read Aloud, Speech Dictation & Scroll tracker */}
      <ChatArea
        conversation={activeConversation}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        isStreaming={isStreaming}
        streamingReasoning={streamingReasoning}
        streamingContent={streamingContent}
        onRegenerate={handleRegenerate}
        onEditPrompt={handleEditPrompt}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportMarkdown={handleExportMarkdown}
        onExportJSON={handleExportJSON}
        selectedModel={selectedModel}
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
          setSettings((prev) => ({ ...prev, model: modelId }));
          saveSettings({ ...settings, model: modelId });
        }}
        useSearchGrounding={useSearchGrounding}
        onToggleSearchGrounding={() => {
          setUseSearchGrounding(!useSearchGrounding);
          if (!useSearchGrounding) setUseMapsGrounding(false);
        }}
        useMapsGrounding={useMapsGrounding}
        onToggleMapsGrounding={() => {
          setUseMapsGrounding(!useMapsGrounding);
          if (!useMapsGrounding) setUseSearchGrounding(false);
        }}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        onScrollChange={(y) => setChatScrollY(y)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearAllChats={handleClearAllChats}
        onExportAllData={handleExportAllData}
        onImportData={handleImportData}
      />
    </div>
  );
}
