import { AppSettings, Conversation, DEFAULT_MODEL_ID } from '../types/chat';

const STORAGE_KEYS = {
  CONVERSATIONS: 'spacebunny_conversations_v1',
  SETTINGS: 'spacebunny_settings_v1',
  ACTIVE_ID: 'spacebunny_active_chat_id',
};

export const SPECIFICITY_SYSTEM_PROMPT =
  'You are Space Bunny, an exceptionally precise, accurate, and deeply insightful AI assistant.\n\n' +
  'CRITICAL BEHAVIOR INSTRUCTIONS:\n' +
  '1. Specificity & Directness: Always provide concrete, highly specific answers immediately. Never give vague, generic, or evasive responses.\n' +
  '2. Ambiguity & Doubt Resolution: Whenever the user asks an ambiguous, incomplete, or doubtful question (or when there are multiple plausible interpretations), explicitly state: "Did you mean [Option A], [Option B], or [Option C]?" and provide the direct, most likely specific solution right away alongside the clarification.\n' +
  '3. Comprehensive Accuracy: Provide exact names, code snippets, mathematical formulas, versions, architectural decisions, and step-by-step reasoning where applicable.\n' +
  '4. Reliable URLs & Official Links: Never invent, guess, or hallucinate deep sub-paths or non-working URLs (e.g. for CBSE, government portals, or institutions). Only provide well-known, verified top-level official domain links (e.g. https://www.cbse.gov.in) and explain the exact website menu steps to reach specific circulars/pages.\n' +
  '5. No Fluff: Avoid generic conversational filler. Deliver high signal-to-noise ratio in every answer.';

const DEFAULT_SETTINGS: AppSettings = {
  model: DEFAULT_MODEL_ID,
  systemPrompt: SPECIFICITY_SYSTEM_PROMPT,
  temperature: 0.6,
  maxTokens: 4096,
  showReasoning: true,
  theme: 'dark',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      systemPrompt:
        !parsed.systemPrompt || parsed.systemPrompt.includes('thoughtful, brilliantly capable AI assistant')
          ? SPECIFICITY_SYSTEM_PROMPT
          : parsed.systemPrompt,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations to localStorage', e);
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  } catch (e) {
    console.error('Failed to save active chat ID', e);
  }
}

// ----------------- Export Utilities -----------------
export function exportConversationToMarkdown(conv: Conversation): string {
  let md = `# ${conv.title}\n\n`;
  md += `*Model:* ${conv.model}\n`;
  md += `*Date:* ${new Date(conv.createdAt).toLocaleString()}\n\n---\n\n`;

  for (const msg of conv.messages) {
    const roleName = msg.role === 'user' ? '👤 User' : '🐰 Space Bunny';
    md += `### ${roleName}\n\n`;

    if (msg.reasoning && msg.role === 'assistant') {
      md += `<details><summary>Thought Process</summary>\n\n${msg.reasoning}\n\n</details>\n\n`;
    }

    md += `${msg.content}\n\n---\n\n`;
  }

  return md;
}

export function exportConversationToJSON(conv: Conversation): string {
  return JSON.stringify(conv, null, 2);
}
