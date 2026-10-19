import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Volume2, 
  VolumeX, 
  User, 
  Search, 
  ChevronDown, 
  Menu, 
  Layers,
  Sparkles,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { MarketTicker } from '../../types/crypto';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface NavbarProps {
  currentTicker: MarketTicker | null;
  tickers: MarketTicker[];
  onSelectSymbol: (symbol: string) => void;
  onOpenAuth: () => void;
  onOpenUserDrawer: () => void;
  onToggleSidebar: () => void;
  user: any;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTicker,
  tickers,
  onSelectSymbol,
  onOpenAuth,
  onOpenUserDrawer,
  onToggleSidebar,
  user,
  ttsEnabled,
  onToggleTts,
  wsConnected,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTicker && prevPriceRef.current !== null) {
      if (currentTicker.price > prevPriceRef.current) {
        setPriceFlash('up');
        setTimeout(() => setPriceFlash(null), 600);
      } else if (currentTicker.price < prevPriceRef.current) {
        setPriceFlash('down');
        setTimeout(() => setPriceFlash(null), 600);
      }
    }
    if (currentTicker) {
      prevPriceRef.current = currentTicker.price;
    }
  }, [currentTicker?.price]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTickers = tickers.filter(t => 
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.baseAsset.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPositive = (currentTicker?.priceChangePercent24h || 0) >= 0;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/[0.08] backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 md:px-6 h-16 gap-3">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectSymbol('BTCUSDT')}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 shadow-md shadow-cyan-500/20">
              <span className="font-extrabold text-sm text-black tracking-tight">CX</span>
              <div className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-[2px] -z-10" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  CRYEXC
                </span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  PRO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Instrument Picker & Live Price Ticker */}
        <div className="flex items-center gap-2 md:gap-5 flex-1 max-w-3xl justify-center">
          {/* Symbol Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition text-left"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-wide">
                    {currentTicker?.baseAsset || 'BTC'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">/USDT</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[9px] text-cyan-400/90 font-mono">PERP • BINANCE</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl glass-panel p-2 z-50 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search asset (e.g. BTC, ETH)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 text-xs rounded-xl pl-8 pr-3 py-2 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredTickers.map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => {
                        onSelectSymbol(t.symbol);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                        t.symbol === currentTicker?.symbol
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{t.baseAsset}</span>
                        <span className="text-[10px] text-slate-500 font-mono">USDT</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-medium">{formatCurrency(t.price)}</div>
                        <div className={`text-[10px] font-mono ${t.priceChangePercent24h >= 0 ? 'text-[#35D49A]' : 'text-[#FF647C]'}`}>
                          {t.priceChangePercent24h >= 0 ? '+' : ''}{t.priceChangePercent24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Price with Tick Animation */}
          {currentTicker && (
            <div className="flex items-center gap-3">
              <div
                className={`flex items-baseline gap-2 px-3 py-1 rounded-xl transition duration-300 ${
                  priceFlash === 'up'
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : priceFlash === 'down'
                    ? 'bg-rose-500/25 text-rose-300'
                    : 'text-white'
                }`}
              >
                <span className="text-base md:text-lg font-mono-num font-bold tracking-tight">
                  {formatCurrency(currentTicker.price)}
                </span>
                <span
                  className={`text-xs font-mono-num font-semibold flex items-center gap-0.5 ${
                    isPositive ? 'text-[#35D49A]' : 'text-[#FF647C]'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}{currentTicker.priceChangePercent24h.toFixed(2)}%
                </span>
              </div>

              {/* 24h Stats Pills (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono text-slate-400 border-l border-white/10 pl-4">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">24h Vol</span>
                  <span className="text-slate-200 font-mono-num">{formatCompactNumber(currentTicker.quoteVolume24h)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">24h High</span>
                  <span className="text-slate-200 font-mono-num">{formatCurrency(currentTicker.high24h)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">24h Low</span>
                  <span className="text-slate-200 font-mono-num">{formatCurrency(currentTicker.low24h)}</span>
                </div>
                {currentTicker.fundingRate !== undefined && (
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Funding</span>
                    <span className={`font-mono-num ${currentTicker.fundingRate >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {(currentTicker.fundingRate * 100).toFixed(4)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Feeds Connection, TTS Toggle & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Connection Status Badge */}
          <div className="hidden sm:flex items-center">
            <StatusBadge
              status={wsConnected ? 'LIVE' : 'LIVE'}
              source={wsConnected ? 'Binance WS 100ms' : 'REST Stream Proxy'}
            />
          </div>

          {/* AI Voice Speech Toggle */}
          <button
            onClick={onToggleTts}
            title={ttsEnabled ? 'AI Audio Speech On (gemini-3.8-flash-tts)' : 'AI Audio Speech Muted'}
            className={`p-2 rounded-xl border transition ${
              ttsEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* User Profile / Auth Button */}
          {user ? (
            <button
              onClick={onOpenUserDrawer}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-cyan-400/30 text-white transition"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold text-black">
                {user.email ? user.email.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline text-xs font-medium max-w-[100px] truncate">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-xs font-semibold text-black tracking-wide shadow-md shadow-cyan-500/20 active:scale-95 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
