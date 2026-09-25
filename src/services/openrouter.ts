import { DEFAULT_MODEL_ID } from '../types/chat';

export interface StreamChatParams {
  model?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk: (delta: { content?: string; reasoning?: string }) => void;
}

export async function streamChatCompletion({
  model = DEFAULT_MODEL_ID,
  messages,
  temperature = 0.7,
  maxTokens = 4096,
  signal,
  onChunk,
}: StreamChatParams): Promise<{ fullContent: string; fullReasoning: string }> {
  // Always route through backend proxy which securely injects server-stored OPENROUTER_API_KEY
  const endpoint = '/api/openrouter/api/v1/chat/completions';

  const payload = {
    model: model || DEFAULT_MODEL_ID,
    messages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Title': 'SpaceBunny Chat',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported on response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullContent = '';
  let fullReasoning = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            if (delta) {
              let chunkReasoning: string | undefined = undefined;
              let chunkContent: string | undefined = undefined;

              if (delta.reasoning) {
                chunkReasoning = delta.reasoning;
              } else if (Array.isArray(delta.reasoning_details)) {
                chunkReasoning = delta.reasoning_details.map((d: any) => d.text || '').join('');
              }

              if (typeof delta.content === 'string') {
                chunkContent = delta.content;
              }

              if (chunkReasoning) {
                fullReasoning += chunkReasoning;
              }
              if (chunkContent) {
                fullContent += chunkContent;
              }

              if (chunkReasoning !== undefined || chunkContent !== undefined) {
                onChunk({
                  content: chunkContent,
                  reasoning: chunkReasoning,
                });
              }
            }
          } catch {}
        }
      }
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return { fullContent, fullReasoning };
    }
    throw err;
  }

  return { fullContent, fullReasoning };
}

export async function checkServerStatus(): Promise<{ connected: boolean; label?: string; limit?: string; error?: string }> {
  try {
    const res = await fetch('/api/openrouter/status');
    if (res.ok) {
      return await res.json();
    }
    return { connected: true, label: 'Space Bunny Active' };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
