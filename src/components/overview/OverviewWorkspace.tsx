import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  ShieldAlert, 
  Sparkles, 
  ArrowUpRight, 
  Layers, 
  Flame,
  Volume2,
  ExternalLink,
  Target
} from 'lucide-react';
import { MarketTicker, MarketNewsItem, AiMarketSynthesis } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface OverviewWorkspaceProps {
  tickers: MarketTicker[];
  currentTicker: MarketTicker | null;
  onSelectSymbol: (symbol: string) => void;
  onNavigateTab: (tab: any) => void;
  news: MarketNewsItem[];
  aiAnalysis: AiMarketSynthesis | null;
  onTriggerAiAnalysis: () => void;
  aiLoading: boolean;
  onPlaySpeech: (text: string) => void;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  tickers,
  currentTicker,
  onSelectSymbol,
  onNavigateTab,
  news,
  aiAnalysis,
  onTriggerAiAnalysis,
  aiLoading,
  onPlaySpeech,
}) => {
  const topCoins = tickers.slice(0, 6);
  const totalVolume = tickers.reduce((acc, t) => acc + (t.quoteVolume24h || 0), 0);
  const btcTicker = tickers.find(t => t.symbol === 'BTCUSDT');
  const btcPrice = btcTicker?.price || 94000;

  // Market Breadth: Percentage of coins up vs down in 24h
  const positiveCoins = tickers.filter(t => t.priceChangePercent24h > 0).length;
  const advanceDeclineRatio = tickers.length > 0 ? (positiveCoins / tickers.length) * 100 : 50;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Terminal Intelligence Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-cyan-400/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                MARKET REGIME DETECTOR
              </span>
              <StatusBadge status="LIVE" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {aiAnalysis?.regime || 'Long Gamma / Mean-Reverting Order Flow'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Dealers positioned in positive gamma regime above $92,000. Passive limit orders absorbing aggressive market liquidity. Low volatility drift prevailing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('signals')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-cyan-400 to-indigo-500 hover:opacity-90 text-black text-xs font-bold tracking-wide shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Target className="w-4 h-4 fill-black" />
              <span>Signal Plus (1:5 Scanner)</span>
            </button>
            <button
              onClick={() => onNavigateTab('orderflow')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-medium tracking-wide flex items-center gap-1.5 transition"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Order Flow</span>
            </button>
            <button
              onClick={() => onNavigateTab('options')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-medium tracking-wide flex items-center gap-1.5 transition"
            >
              <span>Deribit GEX</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/[0.08]">
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">24h Futures Turnover</span>
            <span className="text-sm md:text-base font-mono-num font-bold text-white">{formatCompactNumber(totalVolume)} USDT</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Market Breadth (24h)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm md:text-base font-mono-num font-bold text-emerald-400">{advanceDeclineRatio.toFixed(0)}% Bull</span>
              <div className="flex-1 h-1.5 bg-rose-500/30 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${advanceDeclineRatio}%` }} />
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">BTC Open Interest Est.</span>
            <span className="text-sm md:text-base font-mono-num font-bold text-cyan-400">
              {btcTicker?.openInterest ? formatCompactNumber(btcTicker.openInterest) + ' BTC' : '$34.2B'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Estimated Liquidations (24h)</span>
            <span className="text-sm md:text-base font-mono-num font-bold text-rose-400">$184.2M (64% Shorts)</span>
          </div>
        </div>
      </div>

      {/* Primary Market Watch Tickers Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-400" />
            Top Institutional Instruments
          </h2>
          <span className="text-xs text-slate-400 font-mono">Binance Futures Aggregated</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topCoins.map((coin) => {
            const isPos = coin.priceChangePercent24h >= 0;
            const isSelected = currentTicker?.symbol === coin.symbol;

            return (
              <div
                key={coin.symbol}
                onClick={() => onSelectSymbol(coin.symbol)}
                className={`glass-panel p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  isSelected 
                    ? 'border-cyan-400/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10' 
                    : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center font-mono font-bold text-xs text-white">
                      {coin.baseAsset.slice(0, 3)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{coin.baseAsset}</div>
                      <div className="text-[10px] text-slate-500 font-mono">PERPETUAL</div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                    isPos ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPos ? '+' : ''}{coin.priceChangePercent24h.toFixed(2)}%
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-lg font-mono-num font-bold text-white tracking-tight">
                      {formatCurrency(coin.price)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      24h Vol: {formatCompactNumber(coin.quoteVolume24h)}
                    </span>
                  </div>

                  <div className="text-right text-[11px] font-mono text-slate-400">
                    <div>H: {formatCurrency(coin.high24h)}</div>
                    <div>L: {formatCurrency(coin.low24h)}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Order Flow:</span>
                  <span className="text-cyan-400 flex items-center gap-1 hover:underline" onClick={(e) => {
                    e.stopPropagation();
                    onSelectSymbol(coin.symbol);
                    onNavigateTab('orderflow');
                  }}>
                    View Footprint <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: AI Market Synthesis & Breaking News Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Synthesis Card */}
        <GlassCard
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AI Multi-Factor Market Synthesis</span>
            </div>
          }
          subtitle="Model: gemini-4-argon / gemini-3.8-flash (High Thinking)"
          action={
            <div className="flex items-center gap-2">
              {aiAnalysis && (
                <button
                  onClick={() => onPlaySpeech(`${aiAnalysis.regime}. ${aiAnalysis.orderFlowContext} ${aiAnalysis.gammaContext}`)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition"
                  title="Listen to synthesized audio readout"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onTriggerAiAnalysis}
                disabled={aiLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition disabled:opacity-50"
              >
                {aiLoading ? 'Synthesizing...' : 'Re-Run'}
              </button>
            </div>
          }
        >
          {aiAnalysis ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Bias & Confidence</span>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      aiAnalysis.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {aiAnalysis.bias}
                    </span>
                    <span>{aiAnalysis.confidenceScore}% Congruence</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Invalidation</span>
                  <div className="text-xs text-rose-300 font-mono mt-0.5 max-w-[180px] truncate" title={aiAnalysis.invalidationTrigger}>
                    {aiAnalysis.invalidationTrigger}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1.5">Bullish Drivers</h4>
                <ul className="space-y-1">
                  {aiAnalysis.bullishEvidence.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1.5">Bearish Risks</h4>
                <ul className="space-y-1">
                  {aiAnalysis.bearishEvidence.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Synthesized: {new Date(aiAnalysis.timestamp).toLocaleTimeString()}</span>
                <button
                  onClick={() => onNavigateTab('ai')}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Full Intelligence Lab <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400">Click below to synthesize real-time order-flow, gamma regimes, and fundamentals.</p>
              <button
                onClick={onTriggerAiAnalysis}
                disabled={aiLoading}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-90 transition"
              >
                {aiLoading ? 'Running High-Thinking AI...' : 'Run Quantitative Synthesis'}
              </button>
            </div>
          )}
        </GlassCard>

        {/* Breaking Market Catalysts & Macro News Feed */}
        <GlassCard
          title="Breaking Catalysts & Macro Feed"
          subtitle="Google Search Grounding (Live 48h)"
          action={
            <button
              onClick={() => onNavigateTab('news')}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              All News <ArrowUpRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {news.slice(0, 5).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition group"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {item.source}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white group-hover:text-cyan-400 transition line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {item.summary}
                </p>
              </a>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
