import React, { useState } from 'react';
import { 
  ScanLine, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  TrendingUp, 
  TrendingDown, 
  Bookmark, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MarketTicker } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface MarketScannerProps {
  tickers: MarketTicker[];
  onSelectSymbol: (symbol: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const MarketScanner: React.FC<MarketScannerProps> = ({
  tickers,
  onSelectSymbol,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [minVolume, setMinVolume] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'VOLUME' | 'CHANGE' | 'PRICE'>('VOLUME');

  const filteredTickers = tickers
    .filter((t) => {
      const matchSearch = t.symbol.toLowerCase().includes(search.toLowerCase()) || t.baseAsset.toLowerCase().includes(search.toLowerCase());
      const matchTrend = 
        trendFilter === 'ALL' ? true :
        trendFilter === 'BULLISH' ? t.priceChangePercent24h > 0 :
        t.priceChangePercent24h < 0;
      const matchVol = (t.quoteVolume24h || 0) >= minVolume;
      return matchSearch && matchTrend && matchVol;
    })
    .sort((a, b) => {
      if (sortBy === 'VOLUME') return (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0);
      if (sortBy === 'CHANGE') return b.priceChangePercent24h - a.priceChangePercent24h;
      if (sortBy === 'PRICE') return b.price - a.price;
      return 0;
    });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Scanner Control Deck */}
      <div className="glass-panel rounded-2xl p-4 border border-white/[0.08] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Institutional Market Scanner
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time screener across futures turnover, delta momentum, and options availability
              </p>
            </div>
          </div>

          <StatusBadge status="LIVE" source="Binance Futures" />
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search coin (e.g. BTC, SOL)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 text-xs rounded-xl pl-8 pr-3 py-2 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
            />
          </div>

          {/* Trend Direction */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
            {(['ALL', 'BULLISH', 'BEARISH'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setTrendFilter(dir)}
                className={`flex-1 py-1 rounded-lg transition ${
                  trendFilter === dir
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
            <span className="text-[10px] text-slate-500 px-2 uppercase">Sort:</span>
            {(['VOLUME', 'CHANGE', 'PRICE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`flex-1 py-1 rounded-lg transition ${
                  sortBy === s ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Volume Filter */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
            <span className="text-[10px] text-slate-500 px-2 uppercase">Min Vol:</span>
            {[0, 50e6, 200e6].map((v) => (
              <button
                key={v}
                onClick={() => setMinVolume(v)}
                className={`flex-1 py-1 rounded-lg transition ${
                  minVolume === v ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {v === 0 ? 'Any' : v === 50e6 ? '$50M+' : '$200M+'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <GlassCard noPadding title={`Matching Instruments (${filteredTickers.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-black/30 border-b border-white/[0.08] text-[10px] uppercase text-slate-400">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">24h Change</th>
                <th className="p-3 text-right">24h Volume (USDT)</th>
                <th className="p-3 text-right">24h High / Low</th>
                <th className="p-3 text-center">Options Feed</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTickers.map((t) => {
                const isPos = t.priceChangePercent24h >= 0;
                const hasOptions = t.baseAsset === 'BTC' || t.baseAsset === 'ETH';

                return (
                  <tr
                    key={t.symbol}
                    className="hover:bg-white/[0.02] transition cursor-pointer"
                    onClick={() => onSelectSymbol(t.symbol)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{t.baseAsset}</span>
                        <span className="text-[10px] text-slate-500">USDT</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono-num font-bold text-white">
                      {formatCurrency(t.price)}
                    </td>
                    <td className={`p-3 text-right font-mono-num font-bold ${isPos ? 'text-[#35D49A]' : 'text-[#FF647C]'}`}>
                      {isPos ? '+' : ''}{t.priceChangePercent24h.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right font-mono-num text-slate-300">
                      {formatCompactNumber(t.quoteVolume24h)}
                    </td>
                    <td className="p-3 text-right font-mono-num text-slate-400 text-[11px]">
                      {formatCurrency(t.high24h)} / {formatCurrency(t.low24h)}
                    </td>
                    <td className="p-3 text-center">
                      {hasOptions ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DERIBIT GEX
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(t.symbol);
                            onNavigateTab('signals');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>1:5 Signal</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(t.symbol);
                            onNavigateTab('orderflow');
                          }}
                          className="px-2 py-1 rounded-lg bg-white/[0.05] text-slate-300 hover:text-white border border-white/10 text-[10px] font-semibold transition"
                        >
                          Footprint
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
