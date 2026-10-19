import { AiMarketSynthesis, MarketNewsItem } from '../types/crypto';

export async function runMarketAnalysis(params: {
  asset: string;
  currentPrice: number;
  technicals?: any;
  orderFlow?: any;
  gex?: any;
  derivatives?: any;
  news?: any;
}): Promise<AiMarketSynthesis> {
  const res = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Gemini analysis failed');
  }
  return await res.json();
}

export async function sendChatMessage(params: {
  messages: Array<{ role: 'user' | 'model'; parts: string }>;
  userMessage: string;
  currentSymbol: string;
  marketContext?: any;
}): Promise<{ reply: string }> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Chat failed' }));
    throw new Error(err.error || 'Gemini chat error');
  }
  return await res.json();
}

export async function fetchGroundedNews(): Promise<MarketNewsItem[]> {
  try {
    const res = await fetch('/api/gemini/grounded-news');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch grounded news:', err);
    return [];
  }
}

export async function generateSpeechAudio(text: string, speakerStyle?: string): Promise<string> {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speakerStyle }),
    });
    if (res.ok) {
      const data = await res.json();
      return `data:${data.mimeType};base64,${data.audioBase64}`;
    }
  } catch (e) {
    console.warn('Gemini TTS endpoint unavailable, using browser speech synthesis:', e);
  }

  // Fallback to Web Speech API
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }
  return '';
}

export async function transcribeAudio(base64Audio: string, mimeType = 'audio/webm'): Promise<string> {
  const res = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Audio, mimeType }),
  });
  if (!res.ok) throw new Error('Transcription failed');
  const data = await res.json();
  return data.transcript;
}

export async function analyzeChartScreenshot(
  base64Image: string,
  mimeType = 'image/png',
  prompt?: string
): Promise<string> {
  const res = await fetch('/api/gemini/analyze-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, prompt }),
  });
  if (!res.ok) throw new Error('Chart vision analysis failed');
  const data = await res.json();
  return data.analysis;
}

export async function fetchQuickSummary(symbol: string, price: number, delta: number, cvd: number): Promise<string> {
  const res = await fetch('/api/gemini/quick-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, price, delta, cvd }),
  });
  if (!res.ok) return 'Order flow is actively monitoring liquidity depth.';
  const data = await res.json();
  return data.quickSummary;
}

export async function scanChartSignal(params: {
  base64Image?: string;
  mimeType?: string;
  symbol: string;
  currentPrice: number;
  orderFlow?: any;
  gex?: any;
  derivatives?: any;
}): Promise<any> {
  const res = await fetch('/api/gemini/scan-signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Signal scan failed' }));
    throw new Error(err.error || 'Signal scan failed');
  }
  return await res.json();
}

