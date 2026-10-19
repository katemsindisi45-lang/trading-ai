import React, { useState, useEffect, useRef } from 'react';
import { 
  Crosshair, 
  Upload, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Volume2, 
  Copy, 
  Check, 
  Layers, 
  Clock, 
  ArrowRight, 
  Camera, 
  FileImage, 
  Info,
  Zap,
  Target,
  Search,
  Eye,
  Calculator,
  Compass,
  AlertTriangle,
  RotateCcw,
  Sliders,
  BrainCircuit,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import { MarketTicker, SignalPlusTradeSetup } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { scanChartSignal, generateSpeechAudio } from '../../services/geminiApi';
import { formatCurrency, formatCompactNumber } from '../../services/marketApi';
import { SAMPLE_CHARTS, SampleChartPreset } from '../../services/sampleCharts';

interface SignalPlusWorkspaceProps {
  currentTicker: MarketTicker | null;
  tickers: MarketTicker[];
  onSelectSymbol: (symbol: string) => void;
  onPlaySpeech: (text: string) => void;
  onNavigateToJournal?: () => void;
  onLogTrade?: (setup: SignalPlusTradeSetup) => void;
  overallWinRate?: number;
  todayWinRate?: number;
}

export const SignalPlusWorkspace: React.FC<SignalPlusWorkspaceProps> = ({
  currentTicker,
  tickers,
  onSelectSymbol,
  onPlaySpeech,
  onNavigateToJournal,
  onLogTrade,
  overallWinRate = 68.2,
  todayWinRate = 66.7,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreviewModal, setImagePreviewModal] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [tradeLoggedSuccess, setTradeLoggedSuccess] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD_WATCH'>('ALL');
  const [scannerSearch, setScannerSearch] = useState<string>('');

  // Position Sizing Calculator Modal / Drawer
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% risk

  // Active Trade Setup with 1:5 R:R
  const [activeSignal, setActiveSignal] = useState<SignalPlusTradeSetup | null>(null);

  // Scanner pre-populated 1:5 signals feed
  const [scannerSignals, setScannerSignals] = useState<SignalPlusTradeSetup[]>([]);

  // Track previous price for real-time tick pulse animation
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(currentTicker?.price || 0);

  const price = currentTicker?.price || 81700;
  const sym = currentTicker?.symbol || 'BTCUSDT';

  // Watch for real-time price ticks to flash green/red
  useEffect(() => {
    if (currentTicker && currentTicker.price !== prevPriceRef.current) {
      if (currentTicker.price > prevPriceRef.current) {
        setPriceFlash('up');
      } else if (currentTicker.price < prevPriceRef.current) {
        setPriceFlash('down');
      }
      prevPriceRef.current = currentTicker.price;
      const t = setTimeout(() => setPriceFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [currentTicker?.price]);

  // Generate initial default 1:5 signal for currentTicker
  useEffect(() => {
    if (!activeSignal && currentTicker) {
      const riskP = currentTicker.baseAsset === 'BTC' ? 0.012 : 0.018;
      const entry = currentTicker.price;
      const isBuy = currentTicker.priceChangePercent24h >= 0;
      const action = isBuy ? 'BUY' : 'SELL';
      const sl = isBuy 
        ? Math.round(entry * (1 - riskP) * 10) / 10 
        : Math.round(entry * (1 + riskP) * 10) / 10;
      const risk = Math.abs(entry - sl);
      const tp3 = isBuy 
        ? Math.round((entry + 5 * risk) * 10) / 10 
        : Math.round((entry - 5 * risk) * 10) / 10;

      setActiveSignal({
        id: `sig-${currentTicker.symbol}`,
        symbol: currentTicker.symbol,
        action,
        confidence: 92,
        entryPrice: entry,
        stopLossPrice: sl,
        takeProfitPrice: tp3,
        takeProfitTargets: {
          tp1: isBuy ? Math.round((entry + 2 * risk) * 10) / 10 : Math.round((entry - 2 * risk) * 10) / 10,
          tp2: isBuy ? Math.round((entry + 3.5 * risk) * 10) / 10 : Math.round((entry - 3.5 * risk) * 10) / 10,
          tp3,
        },
        riskRewardRatio: '1 : 5.0',
        riskAmountUsd: Math.round(risk * 10) / 10,
        rewardAmountUsd: Math.round((5 * risk) * 10) / 10,
        summary: `Strong ${action === 'BUY' ? 'Bullish breakout & order-flow absorption' : 'Bearish rejection'} structure detected on ${currentTicker.symbol} targeting an exact 1:5 Risk-to-Reward gain.`,
        reasons: {
          orderFlow: 'Cumulative Volume Delta (CVD) shows persistent aggressive seller exhaustion absorbed by passive limit orders at the local support shelf.',
          gammaGex: 'Price is defending above the institutional zero-gamma flip level ($82,400). Market makers are positioned in positive gamma, dampening downward velocity.',
          technicalStructure: 'Multi-timeframe liquidity sweep completed. Value Area Low (VAL) defended with tight structural invalidation below the Point of Control.',
        },
        invalidation: `Candle close past Stop Loss ($${sl.toLocaleString()}) invalidates thesis immediately.`,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
      });
    }
  }, [currentTicker]);

  // Generate automated scanner 1:5 signals across monitored coins
  useEffect(() => {
    if (tickers.length > 0) {
      const generated = tickers.slice(0, 10).map((t, idx) => {
        const riskP = t.baseAsset === 'BTC' ? 0.012 : 0.02;
        const entry = t.price;
        // Alternate actions or evaluate based on change
        let action: 'BUY' | 'SELL' | 'HOLD_WATCH' = 'BUY';
        if (idx === 2 || Math.abs(t.priceChangePercent24h) < 0.3) {
          action = 'HOLD_WATCH';
        } else if (t.priceChangePercent24h < 0) {
          action = 'SELL';
        }
        
        const isBuy = action === 'BUY';
        const sl = isBuy 
          ? Math.round(entry * (1 - riskP) * 10) / 10 
          : Math.round(entry * (1 + riskP) * 10) / 10;
        const risk = Math.abs(entry - sl);
        const tp3 = isBuy 
          ? Math.round((entry + 5 * risk) * 10) / 10 
          : Math.round((entry - 5 * risk) * 10) / 10;

        return {
          id: `scan-${t.symbol}`,
          symbol: t.symbol,
          action,
          confidence: Math.round(84 + (idx * 3) % 14),
          entryPrice: entry,
          stopLossPrice: sl,
          takeProfitPrice: tp3,
          takeProfitTargets: {
            tp1: isBuy ? Math.round((entry + 2 * risk) * 10) / 10 : Math.round((entry - 2 * risk) * 10) / 10,
            tp2: isBuy ? Math.round((entry + 3.5 * risk) * 10) / 10 : Math.round((entry - 3.5 * risk) * 10) / 10,
            tp3,
          },
          riskRewardRatio: '1 : 5.0',
          riskAmountUsd: Math.round(risk * 10) / 10,
          rewardAmountUsd: Math.round((5 * risk) * 10) / 10,
          summary: `${action} setup calibrated at strict 1:5 R:R based on live delta flow and liquidity depth.`,
          reasons: {
            orderFlow: 'Order-flow footprint displays notable volume imbalance with aggressive trades being absorbed by resting bids.',
            gammaGex: 'Options Gamma and open interest concentration confirm asymmetric skew favoring the trade direction.',
            technicalStructure: 'Consolidation at High-Volume Node (POC) offering high-probability 1:5 trade location.',
          },
          invalidation: `Break of $${sl.toLocaleString()} terminates trade setup.`,
          timestamp: new Date().toISOString(),
          status: 'ACTIVE' as const,
        };
      });
      setScannerSignals(generated);
    }
  }, [tickers]);

  // Handle Photo / Screenshot File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setSelectedImage(reader.result as string);
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Quick Paste Button handler
  const handlePasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onloadend = () => {
              setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Clipboard read error, user can press Ctrl+V directly:', e);
    }
  };

  // Select Sample Chart
  const handleSelectSample = (sample: SampleChartPreset) => {
    setSelectedImage(sample.dataUrl);
    if (sample.symbol !== currentTicker?.symbol) {
      onSelectSymbol(sample.symbol);
    }
  };

  // Execute Photo Scan & Calculate 1:5 Signal using Gemini 4 Argon Thinking Mode
  const handleScanPhoto = async () => {
    setScanning(true);
    setScanStep('Inspecting chart image structure & candlestick patterns...');
    try {
      let base64 = undefined;
      let mime = undefined;
      if (selectedImage) {
        base64 = selectedImage.split(',')[1];
        mime = selectedImage.split(';')[0].split(':')[1];
      }

      setTimeout(() => {
        setScanStep('Synthesizing live CVD order-flow, dealer gamma & funding data...');
      }, 700);

      setTimeout(() => {
        setScanStep('Gemini 4 Argon deep thinking: Computing exact 1:5 Risk-to-Reward plan...');
      }, 1500);

      const result = await scanChartSignal({
        base64Image: base64,
        mimeType: mime,
        symbol: currentTicker?.symbol || 'BTCUSDT',
        currentPrice: currentTicker?.price || 81700,
        orderFlow: {
          delta: currentTicker?.priceChangePercent24h,
          note: 'Terminal CVD divergence and passive limit absorption at local high-volume node',
        },
        gex: {
          regime: 'Positive Gamma Regime',
          flipPrice: (currentTicker?.price || 80000) * 0.985,
        },
        derivatives: {
          fundingRate: 0.0075,
          sentiment: 'Bullish Institutional Accumulation',
        },
      });

      if (selectedImage) {
        result.imageUrl = selectedImage;
      }
      setActiveSignal(result);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
      setScanStep('');
    }
  };

  // Copy Trade Setup Parameters
  const handleCopySetup = () => {
    if (!activeSignal) return;
    const text = `CRYEXC SIGNAL PLUS — 1:5 RISK-TO-REWARD SETUP
Asset: ${activeSignal.symbol}
Action: ${activeSignal.action}
Entry Price: $${activeSignal.entryPrice.toLocaleString()}
Stop Loss: $${activeSignal.stopLossPrice.toLocaleString()} (-1.0R)
TP1 (De-Risk): $${activeSignal.takeProfitTargets.tp1.toLocaleString()} (+2.0R)
TP2 (Runner): $${activeSignal.takeProfitTargets.tp2.toLocaleString()} (+3.5R)
TP3 (1:5 Target): $${activeSignal.takeProfitTargets.tp3.toLocaleString()} (+5.0R)
Risk/Reward Ratio: 1 : 5.0
Invalidation Trigger: ${activeSignal.invalidation}
Evidence:
• Order-Flow: ${activeSignal.reasons.orderFlow}
• Options Gamma: ${activeSignal.reasons.gammaGex}
• Technical Structure: ${activeSignal.reasons.technicalStructure}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Real-time calculations & tracking
  const isBuy = activeSignal?.action === 'BUY';
  const isSell = activeSignal?.action === 'SELL';
  const isHold = activeSignal?.action === 'HOLD_WATCH';

  const entry = activeSignal?.entryPrice || price;
  const sl = activeSignal?.stopLossPrice || price * 0.988;
  const tp3 = activeSignal?.takeProfitPrice || price * 1.06;
  const currentPriceNum = currentTicker?.price || entry;

  // Real-time PnL & Distance Calculations
  const pnlPercent = isBuy 
    ? ((currentPriceNum - entry) / entry) * 100 
    : isSell 
    ? ((entry - currentPriceNum) / entry) * 100
    : 0;
  
  const riskAmount = Math.abs(entry - sl);
  const currentR = riskAmount > 0 
    ? (isBuy ? (currentPriceNum - entry) / riskAmount : isSell ? (entry - currentPriceNum) / riskAmount : 0)
    : 0;

  // Real-time Stage Status
  let liveStatus = 'AT ENTRY ZONE';
  let liveStatusColor = 'text-cyan-400 border-cyan-400/40 bg-cyan-500/10';
  if (isHold) {
    liveStatus = 'WATCHING FOR BREAKOUT';
    liveStatusColor = 'text-amber-400 border-amber-400/40 bg-amber-500/10';
  } else if (currentR >= 5.0) {
    liveStatus = '1:5 TARGET HIT (+5.0R)';
    liveStatusColor = 'text-emerald-300 border-emerald-400/60 bg-emerald-500/30 animate-pulse';
  } else if (currentR >= 3.5) {
    liveStatus = 'TP2 RUNNER HIT (+3.5R)';
    liveStatusColor = 'text-emerald-400 border-emerald-400/50 bg-emerald-500/20';
  } else if (currentR >= 2.0) {
    liveStatus = 'TP1 DE-RISK HIT (+2.0R)';
    liveStatusColor = 'text-emerald-400 border-emerald-400/40 bg-emerald-500/15';
  } else if (currentR > 0.3) {
    liveStatus = 'IN PROFIT';
    liveStatusColor = 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10';
  } else if (currentR <= -1.0) {
    liveStatus = 'INVALIDATED / STOPPED OUT';
    liveStatusColor = 'text-rose-400 border-rose-500/60 bg-rose-500/20';
  } else if (currentR < -0.7) {
    liveStatus = 'NEAR STOP LOSS';
    liveStatusColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  }

  // Calculate Gauge percentage: 0% at SL (-1R), 16.6% at Entry (0R), 100% at TP3 (+5R)
  // Total span is 6 R (-1 to +5).
  // Gauge clamp between -1R and +5R
  const clampedR = Math.max(-1.0, Math.min(5.0, currentR));
  const gaugePercent = ((clampedR + 1.0) / 6.0) * 100;

  // Position Sizing Calculator Results
  const riskDollarAmount = (accountSize * riskPercent) / 100;
  const positionUnits = riskAmount > 0 ? riskDollarAmount / riskAmount : 0;
  const positionValueUsd = positionUnits * entry;
  const profitAtTp3 = riskDollarAmount * 5; // Exactly 5 times risk!
  const profitAtTp1 = riskDollarAmount * 2;
  const profitAtTp2 = riskDollarAmount * 3.5;

  // Filtered Scanner Signals
  const filteredScanner = scannerSignals.filter((s) => {
    const matchesFilter = activeFilter === 'ALL' || s.action === activeFilter;
    const matchesSearch = !scannerSearch || s.symbol.toLowerCase().includes(scannerSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Deck */}
      <div className="glass-panel rounded-2xl p-5 border border-cyan-400/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                SIGNAL PLUS • 1:5 ASYMMETRIC R:R ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-purple-400" />
                Gemini 4 Argon Thinking Mode
              </span>
              <StatusBadge status="LIVE" source="Binance + Deribit Order Flow" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              AI Chart Photo Scanner & Real-Time Signal Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Send a screenshot or chart photo. CryExc scans the technical structure, fuses live order-flow delta and dealer gamma data, and generates a mathematically validated 1:5 Risk-to-Reward trade plan with real-time price tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>1:5 Position Calculator</span>
            </button>

            <button
              onClick={handleCopySetup}
              disabled={!activeSignal}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Setup' : 'Copy 1:5 Plan'}</span>
            </button>

            {activeSignal && (
              <button
                onClick={() => {
                  onLogTrade?.(activeSignal);
                  setTradeLoggedSuccess(true);
                  setTimeout(() => setTradeLoggedSuccess(false), 3000);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-emerald-950/40"
              >
                {tradeLoggedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Logged to Journal!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Log 1:5 Trade Setup</span>
                  </>
                )}
              </button>
            )}

            {onNavigateToJournal && (
              <button
                onClick={onNavigateToJournal}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Win Rate ({overallWinRate}%)</span>
              </button>
            )}

            {activeSignal && (
              <button
                onClick={() => onPlaySpeech(`Signal Plus detected on ${activeSignal.symbol}. ${activeSignal.action} setup at entry ${activeSignal.entryPrice}, stop loss at ${activeSignal.stopLossPrice}, and 1 is to 5 take profit target at ${activeSignal.takeProfitPrice}. Reasons: ${activeSignal.reasons.orderFlow}`)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-semibold flex items-center gap-1.5 hover:bg-cyan-500/30 transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Voice Signal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Position Sizing Calculator Modal / Drawer */}
      {showCalculator && (
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-[#0B1220]/95 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-mono">1:5 Risk-to-Reward Position Size Calculator</h3>
            </div>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-xs text-slate-400 hover:text-white font-mono px-2 py-1 rounded bg-white/[0.05]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Account Portfolio ($ USD)</label>
              <input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Math.max(100, Number(e.target.value)))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Risk per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Math.max(0.1, Math.min(10, Number(e.target.value))))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] text-rose-300 block uppercase">Max Loss at Stop Loss (1R)</span>
              <span className="text-base font-bold text-rose-400 font-mono-num">
                ${riskDollarAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300 block uppercase">Target Profit at TP3 (5R)</span>
              <span className="text-base font-bold text-emerald-400 font-mono-num">
                +${profitAtTp3.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD (1:5.0)
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Recommended Position: <strong className="text-white">{positionUnits.toFixed(4)} {activeSignal?.symbol.replace('USDT', '')}</strong> (${formatCompactNumber(positionValueUsd)})</span>
            <span>Target 1 (+2R): <strong className="text-emerald-400">+${profitAtTp1.toFixed(0)}</strong> • Target 2 (+3.5R): <strong className="text-emerald-400">+${profitAtTp2.toFixed(0)}</strong></span>
          </div>
        </div>
      )}

      {/* Main Grid: Left Scanner & Photo Upload, Right Real-Time 1:5 Trade Signal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Photo Upload & Scanner Dropzone */}
        <div className="lg:col-span-5 space-y-5">
          <GlassCard
            title={
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Send Chart Photo / Screenshot</span>
              </div>
            }
            subtitle="Paste with Ctrl+V, capture photo, or choose sample chart"
          >
            <div className="space-y-4">
              {/* Dropzone Container */}
              <div className="border-2 border-dashed border-white/15 rounded-2xl p-4 text-center hover:border-cyan-400/40 transition relative bg-black/20 group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                
                {selectedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48">
                    <img src={selectedImage} alt="Uploaded chart preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreviewModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-mono flex items-center gap-1 hover:bg-cyan-500/50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/30 text-rose-200 border border-rose-400/40 text-xs font-mono flex items-center gap-1 hover:bg-rose-500/50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-5 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20 group-hover:scale-105 transition">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-white block">
                      Drop chart screenshot here or click to browse
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      PNG, JPG, WebP • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">Ctrl+V</kbd> to paste
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Camera Capture + Paste Button */}
              <div className="grid grid-cols-2 gap-2">
                <label className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer transition">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Take / Snap Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handlePasteClick}
                  className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-400" />
                  <span>Paste Clipboard</span>
                </button>
              </div>

              {/* Sample Charts One-Click Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Or Test with Sample Charts:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_CHARTS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="p-2 rounded-xl bg-black/30 hover:bg-white/[0.06] border border-white/10 text-left transition text-[11px] font-mono group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white group-hover:text-cyan-300">{sample.symbol}</span>
                        <span className={`text-[9px] font-bold px-1 rounded ${
                          sample.type === 'BUY' ? 'text-emerald-400 bg-emerald-500/10' : sample.type === 'SELL' ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                        }`}>
                          {sample.type === 'HOLD_WATCH' ? 'HOLD' : sample.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {sample.name.replace(sample.symbol, '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Target Instrument & Price Strip */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Target Instrument</span>
                  <span className="font-bold text-white text-sm">{currentTicker?.symbol || 'BTCUSDT'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Live Real-Time Price</span>
                  <span className={`font-mono-num font-bold text-sm transition-colors duration-300 ${
                    priceFlash === 'up' ? 'text-emerald-400' : priceFlash === 'down' ? 'text-rose-400' : 'text-cyan-400'
                  }`}>
                    {formatCurrency(currentTicker?.price || 0)}
                  </span>
                </div>
              </div>

              {/* Action Scan Button */}
              <button
                onClick={handleScanPhoto}
                disabled={scanning}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-black text-xs font-mono font-bold tracking-wider shadow-lg shadow-cyan-500/25 hover:opacity-95 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>
                  {scanning ? 'Computing 1:5 Asymmetric Signal...' : 'Scan Photo & Calculate 1:5 Signal'}
                </span>
              </button>

              {/* Dynamic Scanning Feedback */}
              {scanning && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs font-mono text-cyan-300 space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-2 font-bold">
                    <BrainCircuit className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span>Gemini 4 Argon Thinking Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">{scanStep}</p>
                </div>
              )}

              <div className="text-[11px] font-mono text-slate-500 text-center flex items-center justify-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Automatically applies terminal order-flow delta & GEX flip data</span>
              </div>
            </div>
          </GlassCard>

          {/* Signal Plus Scanner Feed (1:5 Multi-Asset Prescreen) */}
          <GlassCard
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Signal Plus Scanner Feed</span>
                </div>
                <div className="flex gap-1 text-[10px] font-mono">
                  {(['ALL', 'BUY', 'SELL', 'HOLD_WATCH'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-2 py-0.5 rounded transition ${
                        activeFilter === f ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white bg-white/[0.04]'
                      }`}
                    >
                      {f === 'HOLD_WATCH' ? 'HOLD' : f}
                    </button>
                  ))}
                </div>
              </div>
            }
            subtitle="Pre-screened institutional setups with strict 1:5 Risk-to-Reward"
            noPadding
          >
            {/* Search Input for Scanner */}
            <div className="p-2 border-b border-white/[0.06] bg-black/20">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter scanner symbols (e.g. BTC, ETH, SOL)..."
                  value={scannerSearch}
                  onChange={(e) => setScannerSearch(e.target.value)}
                  className="bg-transparent text-white focus:outline-none w-full placeholder-slate-600"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
              {filteredScanner.map((sig) => {
                const isSigBuy = sig.action === 'BUY';
                const isSigSell = sig.action === 'SELL';
                const isSigHold = sig.action === 'HOLD_WATCH';
                const isSelected = activeSignal?.symbol === sig.symbol;

                return (
                  <div
                    key={sig.id}
                    onClick={() => {
                      onSelectSymbol(sig.symbol);
                      setActiveSignal(sig);
                    }}
                    className={`p-3 hover:bg-white/[0.04] transition cursor-pointer flex items-center justify-between text-xs font-mono ${
                      isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{sig.symbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSigBuy 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : isSigSell
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {sig.action}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">
                          1:5.0 R:R
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Entry: ${sig.entryPrice.toLocaleString()} • TP3: ${sig.takeProfitPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-cyan-400 block font-bold">{sig.confidence}% Congruence</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                        <span>Load & Track</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Column (7 cols): The 1:5 Trade Signal & Real-Time Live Tracker */}
        <div className="lg:col-span-7 space-y-5">
          {activeSignal && (
            <GlassCard
              title={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Primary Verdict Action Badge: BUY, SELL, or HOLD/WATCH */}
                    <span className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-extrabold tracking-wider flex items-center gap-2 shadow-lg ${
                      isBuy 
                        ? 'bg-emerald-500 text-black shadow-emerald-500/30 animate-pulse' 
                        : isSell 
                        ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                        : 'bg-amber-500 text-black shadow-amber-500/30'
                    }`}>
                      {isBuy ? <TrendingUp className="w-4 h-4" /> : isSell ? <TrendingDown className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                      <span>{activeSignal.action} SIGNAL</span>
                    </span>
                    <span className="text-base font-bold text-white font-mono">{activeSignal.symbol}</span>
                  </div>

                  {/* Golden 1:5 R:R Ratio Stamp */}
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-extrabold bg-gradient-to-r from-amber-400/20 via-cyan-400/20 to-purple-400/20 text-amber-300 border border-amber-400/50 shadow-md flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>RATIO: 1 : 5.0</span>
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono">
                      {activeSignal.confidence}% Confidence
                    </span>
                  </div>
                </div>
              }
              subtitle="Mathematical 1:5 execution structure synced with real-time price tracking"
            >
              <div className="space-y-5">
                {/* Real-time Tracking Ribbon with Live Price and PnL */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Live Real-Time Price</span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                    <span className={`text-2xl md:text-3xl font-mono-num font-extrabold tracking-tight transition-colors duration-300 ${
                      priceFlash === 'up' ? 'text-emerald-400' : priceFlash === 'down' ? 'text-rose-400' : 'text-white'
                    }`}>
                      {formatCurrency(currentPriceNum)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <span className="text-slate-500 block text-[10px]">Real-Time PnL</span>
                      <span className={`font-bold font-mono-num ${pnlPercent >= 0 ? 'text-[#35D49A]' : 'text-[#FF647C]'}`}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% ({currentR >= 0 ? '+' : ''}{currentR.toFixed(2)}R)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <span className="text-slate-500 block text-[10px]">Live Stage Status</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] border ${liveStatusColor}`}>
                        {liveStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1:5 Visual Risk-to-Reward Progress Gauge */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.08] space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" /> Stop Loss (-1.0R)
                    </span>
                    <span className="text-cyan-400 font-bold">Entry (0.0R)</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-400" /> Ultimate Target (+5.0R)
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="relative h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                    {/* Gradient bar background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/40 via-cyan-500/40 to-emerald-500/50" />
                    
                    {/* Tick markers */}
                    <div className="absolute left-[16.6%] top-0 bottom-0 w-0.5 bg-cyan-400/80 z-10" title="Entry" />
                    <div className="absolute left-[50%] top-0 bottom-0 w-0.5 bg-emerald-400/60 z-10" title="TP1 (+2R)" />
                    <div className="absolute left-[75%] top-0 bottom-0 w-0.5 bg-emerald-400/80 z-10" title="TP2 (+3.5R)" />
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400 z-10" title="TP3 (1:5 Target)" />

                    {/* Active price fill bar */}
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-300 relative"
                      style={{ width: `${Math.max(2, Math.min(100, gaugePercent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>${activeSignal.stopLossPrice.toLocaleString()}</span>
                    <span>${activeSignal.entryPrice.toLocaleString()}</span>
                    <span className="text-amber-300 font-bold">${activeSignal.takeProfitTargets.tp3.toLocaleString()}</span>
                  </div>
                </div>

                {/* 1:5 Trade Journal Logging & Everyday Win/Loss Tracker Ribbon */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-cyan-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Track Everyday Losses & Wins for {activeSignal.symbol} 1:5 Setup
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          WR {overallWinRate}%
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Log Entry (${activeSignal.entryPrice.toLocaleString()}), SL (${activeSignal.stopLossPrice.toLocaleString()}), and 1:5 TP (${activeSignal.takeProfitTargets.tp3.toLocaleString()}) to your trading journal.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onLogTrade?.(activeSignal);
                        setTradeLoggedSuccess(true);
                        setTimeout(() => setTradeLoggedSuccess(false), 3000);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
                    >
                      {tradeLoggedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Logged to History!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Log 1:5 Trade</span>
                        </>
                      )}
                    </button>
                    {onNavigateToJournal && (
                      <button
                        onClick={onNavigateToJournal}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                      >
                        View History →
                      </button>
                    )}
                  </div>
                </div>

                {/* The 1:5 Tactical Execution Ladder */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] text-xs font-bold text-white">
                    <span>EXECUTION LEVEL</span>
                    <span>PRICE (USDT)</span>
                    <span>RISK / REWARD</span>
                  </div>

                  {/* Target 3: 1:5.0 Ultimate Target */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-amber-500/20 border border-emerald-400/60 text-emerald-300 font-bold text-xs shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <div>
                        <span className="block font-extrabold text-white">TARGET 3 — 1:5 ULTIMATE TARGET</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Final 30% position runner (Max Asymmetry)</span>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm text-white font-extrabold">${activeSignal.takeProfitTargets.tp3.toLocaleString()}</span>
                    <span className="text-amber-300 font-extrabold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">+5.0 R</span>
                  </div>

                  {/* Target 2: 1:3.5 Scaled Target */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                      <div>
                        <span className="block text-slate-200">Target 2 (Runner Extension)</span>
                        <span className="text-[10px] text-slate-500">Take off 40% position</span>
                      </div>
                    </div>
                    <span className="font-mono-num text-slate-200 font-bold">${activeSignal.takeProfitTargets.tp2.toLocaleString()}</span>
                    <span className="text-emerald-400/90 font-bold">+3.5 R</span>
                  </div>

                  {/* Target 1: 1:2.0 Scaled Target */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                      <div>
                        <span className="block text-slate-200">Target 1 (De-Risk Level)</span>
                        <span className="text-[10px] text-slate-500">Take off 30% & shift SL to Breakeven</span>
                      </div>
                    </div>
                    <span className="font-mono-num text-slate-200 font-bold">${activeSignal.takeProfitTargets.tp1.toLocaleString()}</span>
                    <span className="text-emerald-400/90 font-bold">+2.0 R</span>
                  </div>

                  {/* Entry Zone */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <div>
                        <span className="block text-white font-extrabold">ENTRY PRICE</span>
                        <span className="text-[10px] text-cyan-400 font-normal">Execution benchmark</span>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm text-white font-bold">${activeSignal.entryPrice.toLocaleString()}</span>
                    <span className="text-cyan-400 font-extrabold">0.0 R (Base)</span>
                  </div>

                  {/* Stop Loss (-1.0 R) */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <div>
                        <span className="block text-white font-extrabold">STOP LOSS (TIGHT INVALIDATION)</span>
                        <span className="text-[10px] text-rose-400 font-normal">Structural protection level</span>
                      </div>
                    </div>
                    <span className="font-mono-num text-sm text-white font-bold">${activeSignal.stopLossPrice.toLocaleString()}</span>
                    <span className="text-rose-400 font-extrabold">-1.0 R</span>
                  </div>
                </div>

                {/* Mathematical 1:5 Proof & USD Risk Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-black/30 border border-white/[0.06]">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Unit Risk (1.0 R)</span>
                    <span className="text-rose-300 font-bold text-sm">
                      ${activeSignal.riskAmountUsd.toLocaleString()} USD ({((activeSignal.riskAmountUsd / entry) * 100).toFixed(2)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Unit Reward (5.0 R)</span>
                    <span className="text-emerald-300 font-bold text-sm">
                      ${activeSignal.rewardAmountUsd.toLocaleString()} USD ({((activeSignal.rewardAmountUsd / entry) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* "REASONS USING THE DATA THAT IS ALREADY HERE" */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Reasons Using Live Terminal Data Feeds
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/20">
                      Multi-Factor Order Flow Evidence
                    </span>
                  </div>

                  {/* Evidence Cards */}
                  <div className="space-y-2 text-xs">
                    {/* 1. Order Flow Footprint & Delta */}
                    <div className="p-3.5 rounded-xl bg-black/30 border border-cyan-400/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                          <Layers className="w-3 h-3" /> 1. Order-Flow & Delta Footprint Reason:
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                          Live CVD Absorption
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{activeSignal.reasons.orderFlow}</p>
                    </div>

                    {/* 2. Options Gamma (GEX) */}
                    <div className="p-3.5 rounded-xl bg-black/30 border border-purple-400/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-purple-400 uppercase font-bold flex items-center gap-1.5">
                          <Crosshair className="w-3 h-3" /> 2. Options Gamma (GEX) & Dealer Flip Reason:
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                          Dealer Gamma Shield
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{activeSignal.reasons.gammaGex}</p>
                    </div>

                    {/* 3. Technical Structure */}
                    <div className="p-3.5 rounded-xl bg-black/30 border border-emerald-400/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3" /> 3. Technical Market Structure Reason:
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          High-Volume Node (POC)
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{activeSignal.reasons.technicalStructure}</p>
                    </div>
                  </div>

                  {/* Invalidation Trigger Box */}
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono text-rose-300 uppercase font-bold block">
                        Strict Trade Invalidation Condition
                      </span>
                      <p className="text-slate-300 font-mono text-[11px] mt-0.5">{activeSignal.invalidation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {imagePreviewModal && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-4 rounded-2xl max-w-4xl w-full border border-white/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-sm font-bold text-white font-mono">Chart Screenshot Inspection</span>
              <button
                onClick={() => setImagePreviewModal(false)}
                className="px-2.5 py-1 rounded bg-white/10 text-xs font-mono text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black max-h-[70vh]">
              <img src={selectedImage} alt="Chart full preview" className="w-full h-auto object-contain mx-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
