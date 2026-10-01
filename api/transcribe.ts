import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

type VercelRequest = IncomingMessage & { body: any; query: Record<string, string | string[]> };
type VercelResponse = ServerResponse & {
  json: (data: any) => VercelResponse;
  status: (code: number) => VercelResponse;
  send: (data: any) => VercelResponse;
};

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'audioData base64 is required' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          { inlineData: { data: audioData, mimeType } },
          { text: 'Transcribe this voice recording accurately into text. Return only the transcript.' },
        ],
      },
    });

    return res.json({ transcript: response.text || '' });
  } catch (err: any) {
    console.error('Transcription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
}
