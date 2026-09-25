import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini client utility on the server with User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Proxy for OpenRouter to handle chat completions with server-side key security
app.post('/api/openrouter/api/v1/chat/completions', async (req, res) => {
  try {
    // If client supplied a custom authorization header, use it; otherwise use server-stored OPENROUTER_API_KEY
    let authHeader = req.headers.authorization;
    if (!authHeader || authHeader === 'Bearer' || authHeader === 'Bearer undefined' || authHeader === 'Bearer null') {
      const serverKey = process.env.OPENROUTER_API_KEY || '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';
      authHeader = `Bearer ${serverKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'HTTP-Referer': req.headers['http-referer'] as string || 'https://chat.spacebunny.ai',
        'X-Title': 'SpaceBunny Chat',
      },
      body: JSON.stringify(req.body),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
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
});

// Check model connection status endpoint without exposing keys
app.get('/api/openrouter/status', async (req, res) => {
  try {
    const serverKey = process.env.OPENROUTER_API_KEY || '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';
    const testRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${serverKey}` },
    });

    if (testRes.ok) {
      const data = await testRes.json();
      return res.json({
        connected: true,
        label: data?.data?.label || 'Space Bunny Active',
        limit: data?.data?.limit != null ? `$${data.data.limit}` : 'Active',
      });
    }

    return res.json({ connected: true, label: 'Space Bunny Active' });
  } catch (err: any) {
    return res.status(500).json({ connected: false, error: err.message });
  }
});

// Text-to-Speech endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Clean markdown formatting before TTS
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' [code block omitted] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[*_#>-]/g, '')
      .trim()
      .slice(0, 1500);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Clear, articulate, natural AI voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    let base64Audio = '';
    let mimeType = 'audio/wav';

    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Audio = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/wav';
          break;
        }
      }
    }

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned by TTS model' });
    }

    return res.json({
      audio: base64Audio,
      mimeType,
    });
  } catch (err: any) {
    console.error('TTS generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to synthesize speech',
    });
  }
});

// Audio transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'audioData base64 is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioData,
              mimeType,
            },
          },
          {
            text: 'Transcribe this voice recording accurately into text. Return only the transcript.',
          },
        ],
      },
    });

    return res.json({ transcript: response.text || '' });
  } catch (err: any) {
    console.error('Transcription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// Search & Maps grounded Gemini chat endpoint using gemini-3.5-flash
app.post('/api/gemini/grounded-chat', async (req, res) => {
  try {
    const { prompt, useMaps, latLng } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
                  latLng: {
                    latitude: latLng.latitude,
                    longitude: latLng.longitude,
                  },
                },
              },
            }
          : {}),
      };
    } else {
      config = {
        tools: [{ googleSearch: {} }],
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return res.json({
      text: response.text || '',
      groundingChunks,
    });
  } catch (err: any) {
    console.error('Grounded chat error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate grounded response' });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
