import { AppSettings, Conversation, DEFAULT_MODEL_ID } from '../types/chat';
import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

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
  '4. No Fluff: Avoid generic conversational filler. Deliver high signal-to-noise ratio in every answer.';

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
      // If user had older generic prompt, upgrade to the high-specificity disambiguation prompt
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

// ----------------- Firebase Firestore Sync -----------------
export async function syncConversationsFromFirestore(userId: string): Promise<Conversation[]> {
  try {
    const convCol = collection(db, 'users', userId, 'conversations');
    const q = query(convCol, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const list: Conversation[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        title: data.title || 'Untitled Chat',
        messages: data.messages || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        pinned: !!data.pinned,
        model: data.model || DEFAULT_MODEL_ID,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
      });
    });
    return list;
  } catch (err) {
    console.error('Failed to load conversations from Firestore:', err);
    return [];
  }
}

export async function saveConversationToFirestore(userId: string, conversation: Conversation): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conversation.id);
    await setDoc(
      docRef,
      {
        id: conversation.id,
        userId,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        pinned: !!conversation.pinned,
        model: conversation.model,
        systemPrompt: conversation.systemPrompt || '',
        temperature: conversation.temperature ?? 0.7,
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving conversation to Firestore:', err);
  }
}

export async function deleteConversationFromFirestore(userId: string, convId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'conversations', convId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting conversation from Firestore:', err);
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
