import React, { useState, useRef } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  Upload, 
  Send, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Image as ImageIcon,
  MessageSquare,
  Bot,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { AiMarketSynthesis, MarketTicker } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { 
  runMarketAnalysis, 
  sendChatMessage, 
  generateSpeechAudio, 
  transcribeAudio, 
  analyzeChartScreenshot, 
  fetchQuickSummary 
} from '../../services/geminiApi';

interface AiIntelligenceLabProps {
  currentTicker: MarketTicker | null;
  aiAnalysis: AiMarketSynthesis | null;
  onUpdateAnalysis: (analysis: AiMarketSynthesis) => void;
}

export const AiIntelligenceLab: React.FC<AiIntelligenceLabProps> = ({
  currentTicker,
  aiAnalysis,
  onUpdateAnalysis,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'SYNTHESIS' | 'CHAT' | 'CHART_VISION' | 'VOICE_TRANSCRIBE'>('SYNTHESIS');
  
  // Synthesis state
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string; timestamp: string }>>([
    {
      role: 'model',
      text: `CryExc Quantitative Copilot initialized for ${currentTicker?.symbol || 'BTCUSDT'}. Ask me about order-flow delta imbalances, Deribit gamma flip levels, passive absorption, or technical structures.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Vision state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visionPrompt, setVisionPrompt] = useState<string>('Identify the market structure, key support/resistance levels, order flow context, and high-probability setup from this chart.');
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState<boolean>(false);

  // Voice Recording & Transcribe state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [transcribing, setTranscribing] = useState<boolean>(false);

  // 1. Run High Thinking Synthesis
  const handleRunSynthesis = async () => {
    if (!currentTicker) return;
    setAnalyzing(true);
    try {
      const res = await runMarketAnalysis({
        asset: currentTicker.baseAsset,
        currentPrice: currentTicker.price,
        technicals: {
          priceChange24h: currentTicker.priceChangePercent24h,
          high24h: currentTicker.high24h,
          low24h: currentTicker.low24h,
        },
        orderFlow: {
          status: 'CVD divergence tracking',
          absorption: 'Passive limit absorption active',
        },
        gex: {
          currency: currentTicker.baseAsset === 'ETH' ? 'ETH' : 'BTC',
          regime: 'Positive Gamma Dampening',
        },
      });
      onUpdateAnalysis(res);
    } catch (err: any) {
      console.error('Synthesis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Play Text-to-Speech (gemini-3.8-flash-tts)
  const handlePlayTTS = async (text: string) => {
    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      const url = await generateSpeechAudio(text, 'Clear, institutional crypto market anchor');
      setAudioUrl(url);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setIsPlayingAudio(false);
    }
  };

  // 3. Send Chat Message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');

    const newMsgs = [
      ...chatMessages,
      { role: 'user' as const, text: userMsg, timestamp: new Date().toLocaleTimeString() },
    ];
    setChatMessages(newMsgs);
    setChatLoading(true);

    try {
      const res = await sendChatMessage({
        messages: newMsgs.map((m) => ({ role: m.role, parts: m.text })),
        userMessage: userMsg,
        currentSymbol: currentTicker?.symbol || 'BTCUSDT',
        marketContext: {
          price: currentTicker?.price,
          change24h: currentTicker?.priceChangePercent24h,
          regime: aiAnalysis?.regime,
        },
      });

      setChatMessages((prev) => [
        ...prev,
        { role: 'model', text: res.reply, timestamp: new Date().toLocaleTimeString() },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'model', text: `Error generating response: ${err.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 4. Image Upload & Vision Analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeChart = async () => {
    if (!selectedImage || visionLoading) return;
    setVisionLoading(true);
    setVisionAnalysis(null);
    try {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      const result = await analyzeChartScreenshot(base64Data, mimeType, visionPrompt);
      setVisionAnalysis(result);
    } catch (err: any) {
      setVisionAnalysis(`Analysis failed: ${err.message}`);
    } finally {
      setVisionLoading(false);
    }
  };

  // 5. Voice Recording & Audio Transcription (gemini-3.5-transcribe)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setTranscribing(true);
          try {
            const transcript = await transcribeAudio(base64Audio, 'audio/webm');
            setTranscribedText(transcript);
            setChatInput(transcript);
            setActiveSubTab('CHAT');
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hidden Audio Player for TTS */}
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Header Deck */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                CryExc AI Quantitative Intelligence Lab
              </h2>
              <StatusBadge status="LIVE" source="Gemini 4 Argon & 3.8 Flash" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              High-Thinking reasoning, TTS voice synthesis, microphone transcription, and multimodal chart vision
            </p>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('SYNTHESIS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'SYNTHESIS' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Synthesis (Thinking)
          </button>
          <button
            onClick={() => setActiveSubTab('CHAT')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'CHAT' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Copilot Chat
          </button>
          <button
            onClick={() => setActiveSubTab('CHART_VISION')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'CHART_VISION' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chart Vision
          </button>
          <button
            onClick={() => setActiveSubTab('VOICE_TRANSCRIBE')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'VOICE_TRANSCRIBE' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Voice Query
          </button>
        </div>
      </div>

      {/* 1. SYNTHESIS TAB */}
      {activeSubTab === 'SYNTHESIS' && (
        <div className="space-y-5">
          <GlassCard
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Multi-Factor Institutional Market Synthesis ({currentTicker?.symbol || 'BTCUSDT'})</span>
              </div>
            }
            subtitle="Deep Reasoning with thinkingLevel: HIGH across Fundamentals, Order Flow, GEX, and Catalysts"
            action={
              <div className="flex items-center gap-2">
                {aiAnalysis && (
                  <button
                    onClick={() => handlePlayTTS(`${aiAnalysis.regime}. ${aiAnalysis.orderFlowContext} ${aiAnalysis.gammaContext}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-cyan-300 transition"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingAudio ? 'Pause Voice' : 'Listen Readout (TTS)'}</span>
                  </button>
                )}
                <button
                  onClick={handleRunSynthesis}
                  disabled={analyzing}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-black text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-90 transition disabled:opacity-50"
                >
                  {analyzing ? 'Reasoning with High Thinking...' : 'Execute Deep Synthesis'}
                </button>
              </div>
            }
          >
            {aiAnalysis ? (
              <div className="space-y-5">
                {/* Primary Regime Strip */}
                <div className="p-4 rounded-xl bg-black/40 border border-cyan-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Classified Regime</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{aiAnalysis.regime}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      aiAnalysis.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {aiAnalysis.bias}
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      {aiAnalysis.confidenceScore}% Model Confidence
                    </span>
                  </div>
                </div>

                {/* Evidence Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2">
                    <h4 className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Bullish Evidence Pillars
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiAnalysis.bullishEvidence.map((e, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2">
                    <h4 className="text-xs font-mono uppercase text-rose-400 font-bold flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4" />
                      Bearish Evidence Pillars
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiAnalysis.bearishEvidence.map((e, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Quantitative Context Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                    <span className="text-slate-500 uppercase text-[10px] block">Order Flow Context</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{aiAnalysis.orderFlowContext}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                    <span className="text-slate-500 uppercase text-[10px] block">Gamma & Options Context</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{aiAnalysis.gammaContext}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                    <span className="text-slate-500 uppercase text-[10px] block">Macro & Catalysts</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{aiAnalysis.macroContext}</p>
                  </div>
                </div>

                {/* Invalidation Trigger Warning */}
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-rose-300 uppercase block text-[10px]">
                      HYPOTHESIS INVALIDATION TRIGGER
                    </span>
                    <p className="text-slate-300 mt-0.5">{aiAnalysis.invalidationTrigger}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <BrainCircuit className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-white">Execute Institutional Synthesis</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Combines order-flow footprint, dealer gamma regimes, on-chain fundamentals, and real-time news with Gemini High Thinking mode.
                </p>
                <button
                  onClick={handleRunSynthesis}
                  disabled={analyzing}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-90 transition"
                >
                  {analyzing ? 'Thinking & Synthesizing...' : 'Run Quantitative Synthesis'}
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 2. CHAT TAB */}
      {activeSubTab === 'CHAT' && (
        <GlassCard
          title={
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Institutional Copilot Chat</span>
            </div>
          }
          subtitle="Multi-turn trading copilot with conversational context and immediate response"
          noPadding
        >
          <div className="flex flex-col h-[480px]">
            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-black font-medium shadow-md'
                        : 'bg-black/50 border border-white/10 text-slate-200 leading-relaxed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-mono opacity-70">
                      <span>{msg.role === 'user' ? 'Trader' : 'CryExc AI'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-cyan-400 font-mono animate-pulse">
                    Computing order-flow intelligence...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-black/40 border-t border-white/[0.08] flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about delta absorption, GEX flip level, or trading plan..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-black/50 text-xs rounded-xl px-4 py-2.5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading}
                className="p-2.5 rounded-xl bg-cyan-500 text-black hover:opacity-90 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 3. CHART VISION TAB */}
      {activeSubTab === 'CHART_VISION' && (
        <GlassCard
          title={
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-rose-400" />
              <span>Multimodal Chart Screenshot Vision (Gemini 4 Argon)</span>
            </div>
          }
          subtitle="Upload any technical chart screenshot to extract support/resistance, footprint patterns, and trade setups"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload Area */}
            <div className="space-y-3">
              <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-cyan-400/40 transition cursor-pointer relative bg-black/20">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs text-white font-semibold block">
                  Click or drag chart screenshot here
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  PNG, JPG, WebP supported
                </span>
              </div>

              {selectedImage && (
                <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48">
                  <img src={selectedImage} alt="Uploaded Chart" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Vision Analysis Instruction</label>
                <input
                  type="text"
                  value={visionPrompt}
                  onChange={(e) => setVisionPrompt(e.target.value)}
                  className="w-full bg-black/40 text-xs rounded-xl px-3 py-2 border border-white/10 text-white"
                />
              </div>

              <button
                onClick={handleAnalyzeChart}
                disabled={!selectedImage || visionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {visionLoading ? 'Analyzing Chart Image...' : 'Analyze Chart Image'}
              </button>
            </div>

            {/* Analysis Output */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] min-h-[300px] overflow-y-auto">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2">Institutional Vision Report</span>
              {visionAnalysis ? (
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {visionAnalysis}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono text-center">
                  Upload a chart screenshot to receive deep visual pattern and level recognition.
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* 4. VOICE TRANSCRIBE TAB */}
      {activeSubTab === 'VOICE_TRANSCRIBE' && (
        <GlassCard
          title={
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Voice Query & Transcription (gemini-3.5-transcribe)</span>
            </div>
          }
          subtitle="Speak naturally into your microphone to transcribe queries into prompt intelligence"
        >
          <div className="py-10 text-center space-y-4 max-w-md mx-auto">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-xl ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50'
                  : 'bg-emerald-500 text-black hover:scale-105 shadow-emerald-500/30'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <div>
              <span className="text-sm font-bold text-white block">
                {isRecording ? 'Listening... Speak your query' : 'Press to Record Spoken Query'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                {transcribing ? 'Transcribing with gemini-3.5-transcribe...' : 'e.g. "What is the BTC gamma flip level and current CVD delta?"'}
              </span>
            </div>

            {transcribedText && (
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-left text-xs font-mono">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Transcript Output:</span>
                <p className="text-emerald-400">{transcribedText}</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
};
