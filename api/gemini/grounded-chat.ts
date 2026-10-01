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
    const { prompt, useMaps, latLng } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let config: any = {
      systemInstruction:
        'You are Space Bunny with live grounding data. Provide highly specific, concrete answers. If the user question has doubts or multiple interpretations, clarify with "Did you mean [Option A] or [Option B]?" while answering the most likely specific query right away.',
    };

    if (useMaps) {
      config = {
        tools: [{ googleMaps: {} }],
        ...(latLng
          ? {
              toolConfig: {
                retrievalConfig: {
                  latLng: { latitude: latLng.latitude, longitude: latLng.longitude },
                },
              },
            }
          : {}),
      };
    } else {
      config = { tools: [{ googleSearch: {} }] };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return res.json({ text: response.text || '', groundingChunks });
  } catch (err: any) {
    console.error('Grounded chat error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate grounded response' });
  }
}
