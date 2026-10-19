import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GitCommitVertical, 
  BarChart2, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Settings2, 
  Info,
  Maximize2,
  RefreshCw,
  Eye,
  Crosshair,
  Zap
} from 'lucide-react';
import { FootprintCandle, OrderBookData, AbsorptionSignal, MarketTicker } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface OrderFlowWorkspaceProps {
  currentTicker: MarketTicker | null;
  footprintCandles: FootprintCandle[];
  orderBook: OrderBookData | null;
  absorptionSignals: AbsorptionSignal[];
  recentTrades: Array<{ p: string; q: string; m: boolean; T: number }>;
  onRefresh: () => void;
}

export const OrderFlowWorkspace: React.FC<OrderFlowWorkspaceProps> = ({
  currentTicker,
  footprintCandles,
  orderBook,
  absorptionSignals,
  recentTrades,
  onRefresh,
}) => {
  const [tickAggregation, setTickAggregation] = useState<number>(10);
  const [candleInterval, setCandleInterval] = useState<string>('1m');
  const [viewMode, setViewMode] = useState<'FOOTPRINT' | 'BID_ASK_LADDER' | 'VOLUME_PROFILE'>('FOOTPRINT');
  const [selectedCandle, setSelectedCandle] = useState<FootprintCandle | null>(null);

  // Auto select latest candle if none selected
  useEffect(() => {
    if (footprintCandles.length > 0 && !selectedCandle) {
      setSelectedCandle(footprintCandles[footprintCandles.length - 1]);
    }
  }, [footprintCandles]);

  // Compute Volume Profile (High Volume Nodes, Low Volume Nodes, Point of Control)
  const volumeProfile = useMemo(() => {
    const profileMap = new Map<number, { bid: number; ask: number; total: number }>();
    let grandTotal = 0;
    let pocPrice = 0;
    let pocVol = 0;

    for (const c of footprintCandles) {
      for (const lvl of c.levels) {
        const rounded = Math.round(lvl.price / tickAggregation) * tickAggregation;
        const existing = profileMap.get(rounded) || { bid: 0, ask: 0, total: 0 };
        existing.bid += lvl.bidVol;
        existing.ask += lvl.askVol;
        existing.total += lvl.totalVol;
        grandTotal += lvl.totalVol;
        if (existing.total > pocVol) {
          pocVol = existing.total;
          pocPrice = rounded;
        }
        profileMap.set(rounded, existing);
      }
    }

    const rows = Array.from(profileMap.entries())
      .map(([price, vol]) => ({
        price,
        bid: vol.bid,
        ask: vol.ask,
        total: vol.total,
        isPoc: price === pocPrice,
        pctOfPoc: pocVol > 0 ? (vol.total / pocVol) * 100 : 0,
      }))
      .sort((a, b) => b.price - a.price);

    return { rows: rows.slice(0, 30), pocPrice, pocVol, grandTotal };
  }, [footprintCandles, tickAggregation]);

  // Compute Running Cumulative Volume Delta (CVD)
  const cvdSeries = useMemo(() => {
    let running = 0;
    return footprintCandles.map((c) => {
      running += c.candleDelta;
      return {
        timestamp: c.timestamp,
        price: c.close,
        delta: c.candleDelta,
        cvd: running,
      };
    });
  }, [footprintCandles]);

  // Check for Divergence between Price and CVD
  const cvdDivergence = useMemo(() => {
    if (cvdSeries.length < 5) return null;
    const first = cvdSeries[0];
    const last = cvdSeries[cvdSeries.length - 1];
    const priceChange = last.price - first.price;
    const cvdChange = last.cvd - first.cvd;

    // Price Higher High, CVD Lower High -> Bearish Exhaustion / Passive Absorption
    if (priceChange > 0 && cvdChange < 0) {
      return {
        type: 'BEARISH_DIVERGENCE',
        label: 'Bearish CVD Divergence',
        desc: 'Price trending upwards while Cumulative Delta is negative. Aggressive buyers being absorbed by passive institutional sell limits.',
        color: 'text-[#FF647C] bg-rose-500/10 border-rose-500/30',
      };
    }
    // Price Lower Low, CVD Higher Low -> Bullish Absorption
    if (priceChange < 0 && cvdChange > 0) {
      return {
        type: 'BULLISH_DIVERGENCE',
        label: 'Bullish CVD Divergence',
        desc: 'Price forming lower levels while Cumulative Delta is positive. Aggressive market selling being passively absorbed at support.',
        color: 'text-[#35D49A] bg-emerald-500/10 border-emerald-500/30',
      };
    }
    return {
      type: 'CONVERGENCE',
      label: 'CVD Order Flow In Sync',
      desc: 'Executed market orders are congruent with immediate price displacement.',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    };
  }, [cvdSeries]);

  const activeCandle = selectedCandle || footprintCandles[footprintCandles.length - 1];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <GitCommitVertical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Institutional Footprint & Order Flow
              </h2>
              <StatusBadge status="LIVE" source="Binance AggTrades WS" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Tick-by-tick executed bid/ask delta, high-volume nodes (POC), and passive limit absorption
            </p>
          </div>
        </div>

        {/* Granularity & Interval Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10">
            <span className="px-2 text-slate-500 text-[11px] uppercase">Tick Size:</span>
            {[5, 10, 25, 50].map((tick) => (
              <button
                key={tick}
                onClick={() => setTickAggregation(tick)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tickAggregation === tick
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ${tick}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10">
            <span className="px-2 text-slate-500 text-[11px] uppercase">Interval:</span>
            {['1m', '5m', '15m'].map((int) => (
              <button
                key={int}
                onClick={() => setCandleInterval(int)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  candleInterval === int
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {int}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition"
            title="Refresh order flow snapshot"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Order Flow Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Interactive Footprint Cluster Chart */}
        <div className="lg:col-span-8 space-y-5">
          <GlassCard
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span>Footprint Candle Matrix ({currentTicker?.symbol || 'BTCUSDT'})</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Bid (Sells)</span>
                  <span className="text-slate-600">x</span>
                  <span className="text-cyan-400">Ask (Buys)</span>
                </div>
              </div>
            }
            subtitle="Left column = Aggressive sells hitting bids | Right column = Aggressive buys lifting asks"
            noPadding
          >
            {/* Footprint Candles Horizontal Scroll Container */}
            <div className="p-4 overflow-x-auto min-h-[460px]">
              {footprintCandles.length > 0 ? (
                <div className="flex gap-4 items-start min-w-[700px]">
                  {footprintCandles.slice(-7).map((candle, idx) => {
                    const isSelected = activeCandle?.timestamp === candle.timestamp;
                    const isGreen = candle.close >= candle.open;
                    const isDeltaPos = candle.candleDelta >= 0;

                    return (
                      <div
                        key={candle.timestamp}
                        onClick={() => setSelectedCandle(candle)}
                        className={`flex-1 rounded-xl p-2.5 border transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400/50 shadow-md shadow-cyan-500/10'
                            : 'bg-black/30 border-white/[0.06] hover:border-white/20'
                        }`}
                      >
                        {/* Candle Header Stats */}
                        <div className="text-center pb-2 mb-2 border-b border-white/[0.08] font-mono text-[10px]">
                          <div className="text-slate-400 font-semibold">
                            {new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={`font-bold mt-0.5 ${isDeltaPos ? 'text-[#35D49A]' : 'text-[#FF647C]'}`}>
                            Delta: {candle.candleDelta > 0 ? '+' : ''}{candle.candleDelta.toFixed(1)}
                          </div>
                          <div className="text-slate-500 text-[9px]">
                            Vol: {candle.totalVolume.toFixed(1)}
                          </div>
                        </div>

                        {/* Footprint Price Rows */}
                        <div className="space-y-1 font-mono text-[11px]">
                          {candle.levels.slice(0, 14).map((lvl) => {
                            const isPoc = lvl.price === candle.pocPrice;
                            return (
                              <div
                                key={lvl.price}
                                className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] relative overflow-hidden ${
                                  isPoc
                                    ? 'bg-amber-400/20 border border-amber-400/50 font-bold'
                                    : 'bg-white/[0.02]'
                                }`}
                              >
                                {/* Bid Side (Market Sells) */}
                                <span
                                  className={`z-10 ${
                                    lvl.isSellImbalance
                                      ? 'text-rose-400 font-bold bg-rose-500/20 px-1 rounded'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {lvl.bidVol.toFixed(1)}
                                </span>

                                {/* Price Center */}
                                <span className="z-10 text-slate-300 text-[9px] px-1 font-semibold">
                                  {lvl.price}
                                </span>

                                {/* Ask Side (Market Buys) */}
                                <span
                                  className={`z-10 ${
                                    lvl.isBuyImbalance
                                      ? 'text-cyan-300 font-bold bg-cyan-500/20 px-1 rounded'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {lvl.askVol.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Candle Summary Footer */}
                        <div className="mt-3 pt-2 border-t border-white/[0.08] text-center font-mono text-[9px] text-slate-500">
                          POC: ${candle.pocPrice}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-400 font-mono text-xs">
                  Streaming tick-level trade footprints...
                </div>
              )}
            </div>

            {/* Footprint Footer Stats */}
            <div className="p-3 bg-black/40 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400/40 border border-amber-400" />
                  POC (Point of Control)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-500/30 text-cyan-300 px-0.5 text-[9px]">3x</span>
                  Buy Imbalance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/30 text-rose-300 px-0.5 text-[9px]">3x</span>
                  Sell Imbalance
                </span>
              </div>

              <div className="text-cyan-400">
                Selected Candle Delta: <span className="font-bold">{activeCandle?.candleDelta || 0}</span>
              </div>
            </div>
          </GlassCard>

          {/* Cumulative Volume Delta (CVD) Subpanel */}
          <GlassCard
            title="Cumulative Volume Delta (CVD) & Divergence Monitor"
            subtitle="Tracks running aggressive buying vs selling volume pressure against price displacement"
            action={
              cvdDivergence && (
                <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${cvdDivergence.color}`}>
                  {cvdDivergence.label}
                </div>
              )
            }
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-mono">
                {cvdDivergence?.desc || 'Evaluating order flow delta convergence...'}
              </p>

              {/* Minimal SVG CVD Line Chart */}
              <div className="h-32 w-full bg-black/40 rounded-xl p-3 border border-white/[0.06] relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>CVD Delta Trend</span>
                  <span className="text-cyan-400">Net Delta: {cvdSeries.slice(-1)[0]?.cvd.toFixed(1) || '0'}</span>
                </div>

                {/* SVG Visual Representation */}
                <svg className="w-full h-20 overflow-visible" preserveAspectRatio="none">
                  {cvdSeries.length > 1 && (
                    <>
                      <defs>
                        <linearGradient id="cvdGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#55E6FF" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#55E6FF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Zero Delta Line */}
                      <line x1="0" y1="40" x2="100%" y2="40" stroke="#334155" strokeDasharray="3 3" />

                      {/* CVD Polyline */}
                      <polyline
                        fill="none"
                        stroke="#55E6FF"
                        strokeWidth="2.5"
                        points={cvdSeries.map((pt, i) => {
                          const x = (i / (cvdSeries.length - 1)) * 100;
                          // normalize y between 10 and 70
                          const maxCvd = Math.max(...cvdSeries.map(s => Math.abs(s.cvd)), 10);
                          const y = 40 - (pt.cvd / maxCvd) * 30;
                          return `${x}%,${y}`;
                        }).join(' ')}
                      />
                    </>
                  )}
                </svg>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Earliest Candle</span>
                  <span>Now (Real-Time)</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column (4 cols): Depth of Market (DOM) Ladder & Passive Absorption Signals */}
        <div className="lg:col-span-4 space-y-5">
          {/* Depth of Market (DOM) Price Ladder */}
          <GlassCard
            title="Depth of Market (DOM)"
            subtitle="Resting liquidity bids & asks"
            noPadding
          >
            <div className="p-3 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 pb-1.5 border-b border-white/[0.08]">
                <span>Price (USDT)</span>
                <span>Resting Size</span>
                <span>Depth %</span>
              </div>

              {/* Asks (Sells) */}
              <div className="space-y-0.5">
                {(orderBook?.asks.slice(0, 7) || []).reverse().map((ask) => (
                  <div
                    key={ask.price}
                    className="flex items-center justify-between py-0.5 px-1 rounded relative overflow-hidden text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-all duration-150"
                      style={{ width: `${Math.min(ask.depthPercent, 100)}%` }}
                    />
                    <span className="font-mono-num text-[#FF647C] font-semibold z-10">
                      {ask.price.toFixed(1)}
                    </span>
                    <span className="text-slate-300 z-10">{ask.amount.toFixed(2)}</span>
                    <span className="text-slate-500 text-[10px] z-10">{ask.depthPercent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              {/* Current Spread Indicator */}
              <div className="py-1.5 px-2 bg-black/40 rounded border border-white/[0.08] flex items-center justify-between text-[11px] font-bold text-white">
                <span className="text-cyan-400">LAST SPREAD:</span>
                <span className="font-mono-num">{formatCurrency(currentTicker?.price || 0)}</span>
              </div>

              {/* Bids (Buys) */}
              <div className="space-y-0.5">
                {(orderBook?.bids.slice(0, 7) || []).map((bid) => (
                  <div
                    key={bid.price}
                    className="flex items-center justify-between py-0.5 px-1 rounded relative overflow-hidden text-[11px]"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none transition-all duration-150"
                      style={{ width: `${Math.min(bid.depthPercent, 100)}%` }}
                    />
                    <span className="font-mono-num text-[#35D49A] font-semibold z-10">
                      {bid.price.toFixed(1)}
                    </span>
                    <span className="text-slate-300 z-10">{bid.amount.toFixed(2)}</span>
                    <span className="text-slate-500 text-[10px] z-10">{bid.depthPercent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Institutional Passive Absorption Feed */}
          <GlassCard
            title={
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Passive Absorption Signals</span>
              </div>
            }
            subtitle="Executed order exhaustion vs resting liquidity walls"
          >
            <div className="space-y-3">
              {absorptionSignals.length > 0 ? (
                absorptionSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3 rounded-xl bg-black/30 border border-white/[0.08] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        sig.side === 'BUY_ABSORPTION' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {sig.side === 'BUY_ABSORPTION' ? 'BUYER ABSORPTION' : 'SELLER ABSORPTION'}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {sig.confidence} CONFIDENCE
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      {sig.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Defense Level</span>
                        <span className="text-white font-bold">${sig.defenseLevel.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Invalidation</span>
                        <span className="text-rose-400 font-bold">${sig.invalidationLevel.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs font-mono">
                  Monitoring order book for icebergs and passive absorption spikes...
                </div>
              )}
            </div>
          </GlassCard>

          {/* Time & Sales Trade Tape */}
          <GlassCard
            title="Time & Sales Tape"
            subtitle="Real-time executed market orders"
            noPadding
          >
            <div className="max-h-56 overflow-y-auto p-2 text-[10px] font-mono space-y-1">
              {recentTrades.slice(0, 15).map((t, i) => {
                const isSell = t.m; // sell hitting bid
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02]">
                    <span className="text-slate-500">
                      {new Date(t.T).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={isSell ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      ${parseFloat(t.p).toFixed(1)}
                    </span>
                    <span className="text-slate-300">
                      {parseFloat(t.q).toFixed(3)}
                    </span>
                    <span className={isSell ? 'text-rose-500 text-[9px]' : 'text-emerald-500 text-[9px]'}>
                      {isSell ? 'SELL' : 'BUY'}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
