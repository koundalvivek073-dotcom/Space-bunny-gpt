// Audio player utility for base64 audio (WAV / PCM / MP3)
let activeAudio: HTMLAudioElement | null = null;
let activeAudioContext: AudioContext | null = null;
let activeAudioSource: AudioBufferSourceNode | null = null;

export async function playTTSAudio(
  base64Data: string,
  mimeType = 'audio/wav',
  onEnded?: () => void
): Promise<() => void> {
  // Stop any currently playing audio
  stopAudio();

  // Try standard HTML5 Audio with Data URI first
  try {
    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onended = () => {
      activeAudio = null;
      if (onEnded) onEnded();
    };

    audio.onerror = async () => {
      // Fallback to Web Audio API decoding if direct Audio playback failed
      await playViaWebAudio(base64Data, onEnded);
    };

    await audio.play();
    return () => stopAudio();
  } catch (err) {
    console.warn('HTML5 Audio play failed, trying Web Audio API...', err);
    return playViaWebAudio(base64Data, onEnded);
  }
}

async function playViaWebAudio(base64Data: string, onEnded?: () => void): Promise<() => void> {
  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
    activeAudioContext = audioCtx;

    // Decode PCM or audio container
    try {
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      activeAudioSource = source;

      source.onended = () => {
        stopAudio();
        if (onEnded) onEnded();
      };

      source.start(0);
      return () => stopAudio();
    } catch {
      // If raw 16-bit PCM little endian at 24kHz
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      activeAudioSource = source;

      source.onended = () => {
        stopAudio();
        if (onEnded) onEnded();
      };

      source.start(0);
      return () => stopAudio();
    }
  } catch (err) {
    console.error('Failed to decode and play audio:', err);
    if (onEnded) onEnded();
    return () => {};
  }
}

export function stopAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch {}
    activeAudioSource = null;
  }
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch {}
    activeAudioContext = null;
  }
}

export async function requestTTS(text: string, voice = 'Kore'): Promise<{ audio: string; mimeType: string }> {
  // Call server TTS endpoint
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `TTS request failed with status ${response.status}`);
  }

  return response.json();
}
