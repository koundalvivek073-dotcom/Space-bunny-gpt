export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  reasoningDurationMs?: number;
  timestamp: number;
  model?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

export interface AppSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  showReasoning: boolean;
  theme: 'dark' | 'light';
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextWindow: string;
  badge?: string;
  reasoning: boolean;
}

export const DEFAULT_MODEL_ID = 'stealth/space-bunny-alpha';

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'stealth/space-bunny-alpha',
    name: 'Space Bunny Alpha',
    description: 'High-speed reasoning model with native chain-of-thought & 1M context window.',
    contextWindow: '1M tokens',
    badge: 'Recommended',
    reasoning: true,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Open reasoning model with complete step-by-step thinking tokens.',
    contextWindow: '128K tokens',
    reasoning: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'Omni general-purpose intelligence for coding, creative work, and reasoning.',
    contextWindow: '128K tokens',
    reasoning: false,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Frontier performance in complex reasoning, software engineering, and writing.',
    contextWindow: '200K tokens',
    reasoning: false,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'Fast, open weights model with instruction following and coding prowess.',
    contextWindow: '128K tokens',
    reasoning: false,
  },
];
