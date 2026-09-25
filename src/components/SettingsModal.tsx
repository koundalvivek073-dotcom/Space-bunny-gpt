import React, { useState, useEffect } from 'react';
import { X, Cpu, Sliders, ShieldCheck, Trash2, Download, Upload, Sun, Moon } from 'lucide-react';
import { AppSettings, AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../types/chat';
import { checkServerStatus } from '../services/openrouter';
import { SPECIFICITY_SYSTEM_PROMPT } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearAllChats: () => void;
  onExportAllData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllChats,
  onExportAllData,
  onImportData,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [statusInfo, setStatusInfo] = useState<{ connected: boolean; label?: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      checkServerStatus().then(setStatusInfo);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = formData.theme === 'light';

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const presetPrompts = [
    {
      title: 'High Specificity & Clarity',
      prompt: SPECIFICITY_SYSTEM_PROMPT,
    },
    {
      title: 'Elite Senior Engineer',
      prompt: 'You are an elite Senior Staff Software Engineer and Architect. Provide exact, production-ready code with complete architectural best practices, comprehensive error handling, and precise concrete solutions. If any requirement is doubtful or ambiguous, state "Did you mean [Option A] or [Option B]?" while answering the most probable implementation.',
    },
    {
      title: 'Deep Logical Reasoner',
      prompt: 'You are a rigorous mathematical and logical reasoning specialist. Deconstruct all problems systematically, examine edge cases, verify step-by-step proofs, and explain your deduction process with absolute mathematical precision.',
    },
    {
      title: 'Concise & Direct',
      prompt: 'Provide concise, punchy, high-signal answers with zero fluff or conversational filler. Give the exact solution or answer immediately.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? 'border-slate-200 bg-slate-50/80' : 'border-neutral-800 bg-neutral-900/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-500" />
            <h2 className="text-base font-semibold">Settings & Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Theme Mode Toggle Section */}
          <div className="space-y-2">
            <label className="font-medium text-xs uppercase tracking-wider text-neutral-400">Interface Appearance</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, theme: 'dark' })}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  formData.theme === 'dark'
                    ? 'border-cyan-500 bg-neutral-950 text-white shadow-xs'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="font-semibold">Dark Universe</div>
                  <div className="text-[11px] opacity-75">Deep space with glowing stars</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, theme: 'light' })}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  formData.theme === 'light'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-950 shadow-xs'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <div className="font-semibold">Light Aurora</div>
                  <div className="text-[11px] opacity-75">Clean daylight with crisp glass</div>
                </div>
              </button>
            </div>
          </div>

          {/* Connection Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-medium text-xs">Model Gateway Status</span>
                <p className="text-[11px] text-neutral-400">
                  {statusInfo?.label || 'Space Bunny Alpha Connected'} · Managed securely server-side
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-mono bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected</span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="font-medium flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-500" />
              Primary AI Model
            </label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = formData.model === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setFormData({ ...formData, model: model.id })}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? isLight
                          ? 'border-sky-500 bg-sky-50/70 shadow-xs'
                          : 'border-cyan-500 bg-cyan-950/20'
                        : isLight
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.badge && (
                          <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border ${
                            isLight
                              ? 'text-sky-700 bg-sky-100 border-sky-300'
                              : 'text-cyan-400 bg-cyan-950 border-cyan-800'
                          }`}>
                            {model.badge}
                          </span>
                        )}
                        {model.reasoning && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                            isLight
                              ? 'text-amber-800 bg-amber-100 border-amber-300'
                              : 'text-amber-400 bg-amber-950/50 border-amber-800/50'
                          }`}>
                            Chain of Thought
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 font-mono tabular-nums">{model.contextWindow}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{model.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Prompt & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium">System Instructions</label>
              <div className="flex items-center gap-1">
                {presetPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, systemPrompt: p.prompt })}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {p.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className={`w-full p-2.5 rounded-lg border text-xs focus:outline-hidden transition-colors leading-relaxed ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-100 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* Model Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Temperature</span>
                <span className="font-mono text-cyan-500 tabular-nums">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-neutral-400">Lower = focused, higher = creative</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Max Tokens</span>
                <span className="font-mono text-cyan-500 tabular-nums">{formData.maxTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-neutral-400">Response token ceiling</span>
            </div>
          </div>

          {/* Data & Backup Options */}
          <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <span className="font-medium text-xs uppercase tracking-wider text-neutral-400">Chat Data Management</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportAllData}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                Export Conversations (.json)
              </button>

              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}>
                <Upload className="w-3.5 h-3.5 text-neutral-400" />
                Import Conversations
                <input type="file" accept=".json" onChange={onImportData} className="hidden" />
              </label>

              {confirmClear ? (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-rose-500">Delete all chats?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllChats();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs ml-auto transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-900/90'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                model: DEFAULT_MODEL_ID,
                temperature: 0.7,
                maxTokens: 4096,
              });
            }}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Reset to Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs transition-colors ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
