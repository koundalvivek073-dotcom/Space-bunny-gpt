import React, { useState } from 'react';
import { Copy, Check, RotateCw, Edit3, AlertCircle, Volume2, VolumeX, Loader2, Sparkles, Box } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { FormattedMessage } from './FormattedMessage';
import { ReasoningBlock } from './ReasoningBlock';
import { requestTTS, playTTSAudio, stopAudio } from '../services/tts';
import avatarImg from '../assets/images/avatar_space_bunny_1790312587845.jpg';

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isStreamingReasoning?: boolean;
  onRegenerate?: () => void;
  onEditPrompt?: (newText: string) => void;
  theme?: 'dark' | 'light';
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming = false,
  isStreamingReasoning = false,
  onRegenerate,
  onEditPrompt,
  theme = 'dark',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(message.content);

  // Audio / TTS state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [cachedAudio, setCachedAudio] = useState<{ audio: string; mimeType: string } | null>(null);

  const isUser = message.role === 'user';
  const isLight = theme === 'light';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedText.trim() && onEditPrompt) {
      onEditPrompt(editedText.trim());
      setIsEditing(false);
    }
  };

  // Text-To-Speech handler
  const handleToggleSpeak = async () => {
    if (isPlayingAudio) {
      stopAudio();
      setIsPlayingAudio(false);
      return;
    }

    if (cachedAudio) {
      setIsPlayingAudio(true);
      await playTTSAudio(cachedAudio.audio, cachedAudio.mimeType, () => {
        setIsPlayingAudio(false);
      });
      return;
    }

    try {
      setIsLoadingAudio(true);
      const res = await requestTTS(message.content, 'Kore');
      setCachedAudio(res);
      setIsLoadingAudio(false);
      setIsPlayingAudio(true);
      await playTTSAudio(res.audio, res.mimeType, () => {
        setIsPlayingAudio(false);
      });
    } catch (err: any) {
      console.warn('TTS request failed, falling back to Web Speech API:', err);
      setIsLoadingAudio(false);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message.content.slice(0, 800));
        utterance.rate = 1.05;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        setIsPlayingAudio(true);
        window.speechSynthesis.speak(utterance);
      } else {
        alert('Text-to-speech could not be played.');
      }
    }
  };

  if (isUser) {
    return (
      <div className="group flex justify-end w-full max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col items-end max-w-2xl w-full">
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              className={`w-full rounded-2xl p-3 border space-y-2 ${
                isLight ? 'bg-white border-slate-300 shadow-md' : 'bg-neutral-850 border-neutral-700'
              }`}
            >
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={3}
                className={`w-full bg-transparent text-sm focus:outline-hidden resize-none leading-relaxed ${
                  isLight ? 'text-slate-900 font-medium' : 'text-neutral-100'
                }`}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          ) : (
            <div className="relative group/bubble">
              <div
                className={`px-4 py-3 rounded-2xl rounded-tr-xs text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap break-words border font-normal ${
                  isLight
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sky-600/10'
                    : 'bg-neutral-800 text-neutral-100 border-neutral-700/60'
                }`}
              >
                {message.content}
              </div>

              {/* Action buttons on hover */}
              <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1.5 mt-1 justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  title="Edit prompt"
                  className={`p-1 rounded transition-colors text-xs ${
                    isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopy}
                  title="Copy text"
                  className={`p-1 rounded transition-colors text-xs ${
                    isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant Message: Rendered with cool 3D perspective emergence animation & high contrast typography
  return (
    <div
      className={`w-full border-y py-5 transition-all duration-300 animate-3d-spatial ${
        isLight
          ? 'bg-white/85 backdrop-blur-md border-slate-300/80 text-slate-900 holographic-card-light'
          : 'bg-neutral-950/70 backdrop-blur-md border-neutral-800/80 text-neutral-100 holographic-card-dark'
      }`}
    >
      <div className="w-full max-w-4xl mx-auto px-4 flex gap-4">
        {/* 3D Holographic Avatar Frame */}
        <div className="shrink-0 mt-0.5">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 opacity-60 blur-xs group-hover:opacity-100 transition duration-500" />
            <img
              src={avatarImg}
              alt="Space Bunny"
              referrerPolicy="no-referrer"
              className="relative w-8 h-8 rounded-xl object-cover ring-1 ring-cyan-400/50 shadow-md"
            />
            {isStreaming && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-neutral-900 animate-pulse" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header with 3D Hologram Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xs tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Space Bunny
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isLight ? 'text-sky-800 bg-sky-100/90 border-sky-300' : 'text-cyan-300 bg-cyan-950/70 border-cyan-800/60'
              }`}>
                {message.model ? message.model.split('/')[1] : 'Alpha'}
              </span>
            </div>

            {/* 3D Spatial Indicator */}
            <div className={`flex items-center gap-1 text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-cyan-400/80'}`}>
              <Box className="w-3 h-3 text-cyan-500 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="hidden sm:inline">3D Spatial Response</span>
            </div>
          </div>

          {/* Reasoning / Thinking block if model reasoned */}
          {(message.reasoning || isStreamingReasoning) && (
            <ReasoningBlock
              reasoning={message.reasoning || ''}
              isStreamingReasoning={isStreamingReasoning}
              durationMs={message.reasoningDurationMs}
            />
          )}

          {/* Formatted Markdown Content - Full High Contrast in Light & Dark mode */}
          <div className={`text-[15px] leading-relaxed select-text ${isLight ? 'text-slate-900 font-normal' : 'text-neutral-100'}`}>
            {message.content ? (
              <FormattedMessage content={message.content} isStreaming={isStreaming} />
            ) : isStreaming && !isStreamingReasoning ? (
              <div className="flex items-center gap-2 py-2 text-sm text-cyan-600 dark:text-cyan-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
                <span className="font-medium animate-pulse">Materializing 3D quantum response...</span>
              </div>
            ) : null}
          </div>

          {/* Error display if any */}
          {message.error && (
            <div className="mt-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{message.error}</span>
              </div>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Bottom Actions including Read Aloud / TTS */}
          {!isStreaming && message.content && (
            <div className={`flex items-center gap-2 pt-2 text-xs border-t ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-neutral-800/60 text-neutral-400'
            }`}>
              {/* Text-To-Speech Button */}
              <button
                onClick={handleToggleSpeak}
                disabled={isLoadingAudio}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  isPlayingAudio
                    ? isLight
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-medium'
                      : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
                    : isLight
                    ? 'hover:bg-slate-200/80 hover:text-slate-900'
                    : 'hover:bg-neutral-800 hover:text-neutral-200'
                }`}
                title={isPlayingAudio ? 'Stop reading' : 'Read aloud with AI voice'}
              >
                {isLoadingAudio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                    <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">Generating voice...</span>
                  </>
                ) : isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                    <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Read Aloud</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  isLight ? 'hover:bg-slate-200/80 hover:text-slate-900' : 'hover:bg-neutral-800 hover:text-neutral-200'
                }`}
                title="Copy entire response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    isLight ? 'hover:bg-slate-200/80 hover:text-slate-900' : 'hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                  title="Regenerate this response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
