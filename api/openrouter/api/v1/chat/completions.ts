import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { body: any; query: Record<string, string | string[]> };
type VercelResponse = ServerResponse & {
  json: (data: any) => VercelResponse;
  status: (code: number) => VercelResponse;
  send: (data: any) => VercelResponse;
};

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let authHeader = (req.headers as any).authorization as string;
    if (!authHeader || authHeader === 'Bearer' || authHeader === 'Bearer undefined' || authHeader === 'Bearer null') {
      const serverKey = process.env.OPENROUTER_API_KEY || '';
      authHeader = `Bearer ${serverKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'HTTP-Referer': ((req.headers as any)['http-referer'] as string) || 'https://space-bunny-gpt.vercel.app',
        'X-Title': 'SpaceBunny Chat',
      },
      body: JSON.stringify(req.body),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'content-length' &&
        lowerKey !== 'transfer-encoding' &&
        lowerKey !== 'connection'
      ) {
        res.setHeader(key, value);
      }
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('OpenRouter proxy error:', err);
    res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
  }
}
