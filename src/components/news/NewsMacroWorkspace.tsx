import React, { useState } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  RefreshCw, 
  Search,
  Globe,
  Radio
} from 'lucide-react';
import { MarketNewsItem } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';

interface NewsMacroWorkspaceProps {
  news: MarketNewsItem[];
  onRefresh: () => void;
  loading: boolean;
}

export const NewsMacroWorkspace: React.FC<NewsMacroWorkspaceProps> = ({
  news,
  onRefresh,
  loading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const categories = ['ALL', 'MACRO', 'REGULATORY', 'ETF', 'PROTOCOL', 'SECURITY', 'EXCHANGE'];

  const filteredNews = news.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.summary.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header Deck */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Crypto Catalysts & Macro Intelligence Feed
              </h2>
              <StatusBadge status="LIVE" source="Google Search Grounding" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live macroeconomic interest rate catalysts, regulatory filings, ETF flows, and protocol exploits
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Catalysts</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-mono tracking-wider transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search headline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 text-xs rounded-xl pl-8 pr-3 py-2 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/50"
          />
        </div>
      </div>

      {/* News List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.map((item) => {
          const isBullish = item.sentiment === 'BULLISH';
          const isBearish = item.sentiment === 'BEARISH';

          return (
            <div
              key={item.id}
              className="glass-panel p-4 rounded-2xl border border-white/[0.08] hover:border-white/20 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {item.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                      isBullish
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isBearish
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    }`}>
                      {isBullish ? <TrendingUp className="w-3 h-3" /> : isBearish ? <TrendingDown className="w-3 h-3" /> : null}
                      {item.sentiment}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {item.source}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white hover:text-cyan-400 transition leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                {item.url && item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    <span>Read Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
