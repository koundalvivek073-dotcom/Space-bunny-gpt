import React, { useRef, useEffect, useState } from 'react';
import {
  PanelLeft,
  ArrowUp,
  Square,
  Sparkles,
  Download,
  Paperclip,
  X,
  ChevronDown,
  ArrowDown,
  Code2,
  BrainCircuit,
  Boxes,
  Compass,
  Mic,
  MicOff,
  Globe,
  MapPin,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { ChatMessage, Conversation, AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import avatarImg from '../assets/images/avatar_space_bunny_1790312587845.jpg';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  streamingReasoning: string;
  streamingContent: string;
  onRegenerate: () => void;
  onEditPrompt: (newText: string) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  // Grounding options
  useSearchGrounding: boolean;
  onToggleSearchGrounding: () => void;
  useMapsGrounding: boolean;
  onToggleMapsGrounding: () => void;
  // Theme and 3D Scroll notification
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onScrollChange?: (scrollY: number) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  streamingReasoning,
  streamingContent,
  onRegenerate,
  onEditPrompt,
  onToggleSidebar,
  onOpenSettings,
  onExportMarkdown,
  onExportJSON,
  selectedModel,
  onSelectModel,
  useSearchGrounding,
  onToggleSearchGrounding,
  useMapsGrounding,
  onToggleMapsGrounding,
  theme,
  onToggleTheme,
  onScrollChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isLight = theme === 'light';

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Handle scroll events & pass to 3D scene
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isAtBottom);

    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom('auto');
    }
  }, [streamingContent, streamingReasoning, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || isStreaming) return;

    let fullPrompt = inputText.trim();
    if (attachedFile) {
      fullPrompt = `[Attached File: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${fullPrompt}`;
    }

    onSendMessage(fullPrompt);
    setInputText('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Please select a file smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({ name: file.name, content });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Voice recording and Gemini-3.5-transcribe
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (!base64Data) return;

          try {
            setIsTranscribing(true);
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Data, mimeType: 'audio/webm' }),
            });
            const data = await res.json();
            if (data.transcript) {
              setInputText((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            }
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or unsupported:', err);
      alert('Microphone access could not be initialized.');
    }
  };

  const examplePrompts = [
    {
      icon: <BrainCircuit className="w-4 h-4 text-cyan-500" />,
      title: 'Disambiguation & Specificity',
      prompt: 'How to build an auth system? Please disambiguate if I meant JWT vs Session cookies vs OAuth2, and give the exact production implementation for the best choice.',
    },
    {
      icon: <Code2 className="w-4 h-4 text-emerald-500" />,
      title: 'Precise TypeScript Implementation',
      prompt: 'Implement an LRU Cache class in TypeScript with O(1) get and put methods using a Map and doubly-linked nodes. Include type annotations, error handling, and test cases.',
    },
    {
      icon: <Boxes className="w-4 h-4 text-amber-500" />,
      title: 'Detailed System Architecture',
      prompt: 'Design a distributed rate limiter for 100K RPS. Specifically evaluate Redis token bucket vs sliding window counter, providing exact Redis Lua scripts and edge case resolutions.',
    },
    {
      icon: <Compass className="w-4 h-4 text-violet-500" />,
      title: 'Physics & Mathematical Proof',
      prompt: 'Explain quantum entanglement and Bell inequalities in specific mathematical terms. Break down the CHSH inequality proof and experimental photon test results.',
    },
  ];

  const currentModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const messages = conversation?.messages || [];

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${
        isLight ? 'bg-slate-100/50 backdrop-blur-xs text-slate-800' : 'bg-neutral-950/40 backdrop-blur-xs text-neutral-100'
      }`}
    >
      {/* Top Navigation Bar */}
      <header
        className={`h-14 border-b backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20 transition-colors ${
          isLight ? 'border-slate-200/90 bg-white/70' : 'border-neutral-800/80 bg-neutral-950/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Toggle sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-white/90 hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                  : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-100 border-neutral-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>{currentModelObj.name}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  isLight ? 'text-sky-700 bg-sky-100' : 'text-cyan-400 bg-cyan-950/80'
                }`}
              >
                {currentModelObj.contextWindow}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {showModelMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowModelMenu(false)} />
                <div
                  className={`absolute left-0 mt-1.5 w-72 rounded-xl border shadow-xl z-40 py-1.5 text-xs ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-neutral-900 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Select Model
                  </div>
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setShowModelMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
                        m.id === selectedModel
                          ? isLight
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-cyan-950/40 text-cyan-300'
                          : isLight
                          ? 'hover:bg-slate-100 text-slate-700'
                          : 'hover:bg-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span>{m.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{m.contextWindow}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 line-clamp-1">{m.description}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Grounding toggles */}
          <div className={`hidden md:flex items-center gap-1.5 border-l pl-3 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <button
              onClick={onToggleSearchGrounding}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                useSearchGrounding
                  ? isLight
                    ? 'bg-sky-100 text-sky-700 border border-sky-300 font-medium'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-medium'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
              title="Ground answers with live Google Search web data"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Search</span>
            </button>

            <button
              onClick={onToggleMapsGrounding}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                useMapsGrounding
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-medium'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
              title="Ground answers with live Google Maps place & reviews data"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle button */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg border transition-colors ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-amber-600 shadow-xs'
                : 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700/60 text-amber-400'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Export Dropdown */}
          {messages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                    : 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700/60 text-neutral-300'
                }`}
                title="Export chat"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                  <div
                    className={`absolute right-0 mt-1.5 w-40 rounded-xl border shadow-xl z-40 py-1 text-xs ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-neutral-900 border-neutral-700 text-neutral-200'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onExportMarkdown();
                        setShowExportMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isLight ? 'hover:bg-slate-100' : 'hover:bg-neutral-800'
                      }`}
                    >
                      Export as Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        onExportJSON();
                        setShowExportMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isLight ? 'hover:bg-slate-100' : 'hover:bg-neutral-800'
                      }`}
                    >
                      Export as JSON (.json)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Messages Scroll View */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="min-h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4 py-12 text-center select-none">
            <div className="relative mb-5">
              <img
                src={avatarImg}
                alt="Space Bunny"
                referrerPolicy="no-referrer"
                className="w-18 h-18 rounded-3xl object-cover ring-2 ring-cyan-500/40 shadow-xl"
              />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
              </span>
            </div>

            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Space Bunny Alpha
            </h1>
            <p className={`mt-2 text-sm max-w-md leading-relaxed ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
              High-precision reasoning engine. If your question has doubts or ambiguities, Space Bunny resolves: <em>&ldquo;Did you mean X, Y, or Z?&rdquo;</em> with exact, specific answers.
            </p>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full text-left">
              {examplePrompts.map((card, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setInputText(card.prompt);
                    textareaRef.current?.focus();
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all group ${
                    isLight
                      ? 'bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {card.icon}
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-neutral-200 group-hover:text-white'}`}>
                      {card.title}
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-400 line-clamp-2 leading-snug">
                    {card.prompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Populated chat messages */
          <div className="py-4 space-y-1">
            {messages.map((msg, index) => {
              const isLastAssistant =
                msg.role === 'assistant' && index === messages.length - 1;

              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  theme={theme}
                  isStreaming={isStreaming && isLastAssistant}
                  onRegenerate={
                    index === messages.length - 1 && msg.role === 'assistant'
                      ? onRegenerate
                      : undefined
                  }
                  onEditPrompt={
                    msg.role === 'user' ? (newText) => onEditPrompt(newText) : undefined
                  }
                />
              );
            })}

            {/* In-progress streaming assistant message */}
            {isStreaming && (
              <ChatMessageItem
                key="streaming-temp"
                theme={theme}
                message={{
                  id: 'streaming-temp',
                  role: 'assistant',
                  content: streamingContent,
                  reasoning: streamingReasoning,
                  timestamp: Date.now(),
                  model: selectedModel,
                }}
                isStreaming={true}
                isStreamingReasoning={!streamingContent && !!streamingReasoning}
              />
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className={`absolute right-6 bottom-28 p-2 rounded-full border shadow-lg transition-all z-20 ${
            isLight
              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
          }`}
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Composer Area */}
      <div
        className={`border-t p-4 shrink-0 transition-colors ${
          isLight ? 'border-slate-200/90 bg-white/70 backdrop-blur-md' : 'border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-2">
          {/* File Attachment Pill */}
          {attachedFile && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-fit border ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-neutral-800 border-neutral-700 text-neutral-200'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-cyan-500" />
              <span className="font-mono truncate max-w-xs">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="p-0.5 hover:opacity-75 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Box */}
          <div
            className={`relative rounded-2xl border transition-all p-2 ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30 shadow-xs'
                : 'bg-neutral-900 border-neutral-750 focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'Listening to microphone...'
                  : isTranscribing
                  ? 'Transcribing audio...'
                  : 'Ask Space Bunny anything... (Shift+Enter for newline)'
              }
              rows={1}
              className={`w-full pl-3 pr-24 py-1.5 bg-transparent text-sm placeholder-slate-400 dark:placeholder-neutral-400 resize-none focus:outline-hidden leading-relaxed max-h-48 ${
                isLight ? 'text-slate-950 font-medium' : 'text-neutral-100 font-normal'
              }`}
            />

            {/* Bottom Input Actions */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.js,.ts,.tsx,.py,.json,.csv,.md,.html,.css"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file (.txt, code, json, md)"
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Microphone / Transcribe button */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  disabled={isTranscribing}
                  title={isRecording ? 'Stop recording' : 'Speak to dictate (Transcribe)'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : isTranscribing
                      ? 'bg-neutral-800 text-cyan-400'
                      : isLight
                      ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Configure Model & Settings"
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 hidden sm:inline">
                  {inputText.length > 0 && `${inputText.length} chars`}
                </span>

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStopStreaming}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
                    title="Stop generating"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!inputText.trim() && !attachedFile}
                    className={`p-2 rounded-xl transition-all font-semibold shadow-xs disabled:opacity-30 ${
                      isLight
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-neutral-100 hover:bg-white text-neutral-900'
                    }`}
                    title="Send message"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
            <span>Click &lsquo;Read Aloud&rsquo; on any response to hear natural AI narration.</span>
            <span className="hidden md:inline font-mono">OpenRouter · stealth/space-bunny-alpha</span>
          </div>
        </div>
      </div>
    </div>
  );
};
