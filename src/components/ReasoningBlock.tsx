import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain, Copy, Check } from 'lucide-react';

interface ReasoningBlockProps {
  reasoning: string;
  isStreamingReasoning?: boolean;
  durationMs?: number;
  defaultExpanded?: boolean;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  reasoning,
  isStreamingReasoning = false,
  durationMs,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || isStreamingReasoning);
  const [copied, setCopied] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // If streaming reasoning starts, expand it so the user can see the thoughts flowing
  useEffect(() => {
    if (isStreamingReasoning) {
      setIsExpanded(true);
      const start = Date.now();
      const interval = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - start) / 1000));
      }, 500);
      return () => clearInterval(interval);
    } else {
      if (durationMs) {
        setTimerSeconds(Math.max(1, Math.round(durationMs / 1000)));
      }
    }
  }, [isStreamingReasoning, durationMs]);

  if (!reasoning && !isStreamingReasoning) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reasoning);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-3 rounded-xl border border-slate-300 dark:border-neutral-800/80 bg-slate-50/80 dark:bg-neutral-900/40 overflow-hidden text-xs shadow-xs transition-colors">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/80 dark:hover:bg-neutral-800/40 transition-colors text-left select-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-3.5 h-3.5 ${isStreamingReasoning ? 'text-cyan-600 dark:text-cyan-400 animate-pulse' : 'text-slate-500 dark:text-neutral-400'}`} />
          <span className="font-semibold text-slate-800 dark:text-neutral-200">
            {isStreamingReasoning ? (
              <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 font-medium">
                Reasoning Process... <span className="text-slate-500 dark:text-neutral-400 text-[11px] tabular-nums">({timerSeconds}s)</span>
              </span>
            ) : (
              <span>
                Thought Process <span className="font-mono text-slate-500 dark:text-neutral-400 text-[11px] tabular-nums font-normal">({timerSeconds || 2}s)</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reasoning && !isStreamingReasoning && (
            <button
              onClick={handleCopy}
              title="Copy thought process"
              className="p-1 rounded text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-200/60 dark:hover:bg-neutral-800 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-neutral-800/50">
          <div className="p-2.5 rounded-lg bg-slate-100/90 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-900 font-mono text-[12px] leading-relaxed text-slate-800 dark:text-neutral-300 max-h-64 overflow-y-auto whitespace-pre-wrap selection:bg-cyan-500/20">
            {reasoning || (isStreamingReasoning ? 'Formulating reasoning trace...' : '')}
          </div>
        </div>
      )}
    </div>
  );
};
