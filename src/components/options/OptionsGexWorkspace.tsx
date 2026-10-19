import React, { useState, useEffect } from 'react';
import { 
  Sigma, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Info,
  Calendar,
  Layers,
  BarChart,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { GammaExposureMetrics, MarketTicker } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { fetchOptionsGex, formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface OptionsGexWorkspaceProps {
  currentTicker: MarketTicker | null;
  onSelectSymbol: (symbol: string) => void;
}

export const OptionsGexWorkspace: React.FC<OptionsGexWorkspaceProps> = ({
  currentTicker,
  onSelectSymbol,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'ETH'>('BTC');
  const [gexData, setGexData] = useState<GammaExposureMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // Sync with currentTicker if user selected BTC or ETH
  useEffect(() => {
    if (currentTicker) {
      if (currentTicker.baseAsset === 'ETH') {
        setSelectedCurrency('ETH');
      } else if (currentTicker.baseAsset === 'BTC') {
        setSelectedCurrency('BTC');
      }
    }
  }, [currentTicker?.baseAsset]);

  const loadOptions = async (curr: 'BTC' | 'ETH') => {
    setLoading(true);
    setErrorReason(null);
    try {
      const res = await fetchOptionsGex(curr);
      if ('available' in res && res.available === false) {
        setErrorReason(res.reason);
        setGexData(null);
      } else {
        setGexData(res as GammaExposureMetrics);
      }
    } catch (err: any) {
      setErrorReason(`Deribit options feed unavailable: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions(selectedCurrency);
  }, [selectedCurrency]);

  const isCurrentAssetSupported = currentTicker?.baseAsset === 'BTC' || currentTicker?.baseAsset === 'ETH';

  if (!isCurrentAssetSupported) {
    return (
      <div className="py-16 text-center space-y-4 max-w-lg mx-auto glass-panel p-8 rounded-2xl border border-white/10">
        <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mx-auto text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white uppercase font-mono tracking-wide">
          OPTIONS DATA UNAVAILABLE
        </h3>
        <p className="text-xs text-slate-400">
          In accordance with CryExc's strict Data Integrity Contract, options and gamma metrics are only provided for instruments with authentic institutional options order books (BTC and ETH via Deribit). CryExc never fabricates synthetic gamma for unsupported tokens.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              onSelectSymbol('BTCUSDT');
              setSelectedCurrency('BTC');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:opacity-90 transition"
          >
            Switch to BTC Options
          </button>
          <button
            onClick={() => {
              onSelectSymbol('ETHUSDT');
              setSelectedCurrency('ETH');
            }}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:opacity-90 transition"
          >
            Switch to ETH Options
          </button>
        </div>
      </div>
    );
  }

  const isPositiveGamma = (gexData?.netGexUsd || 0) >= 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Options Header Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Deribit Institutional Gamma Exposure (GEX) & Options
              </h2>
              <StatusBadge status={loading ? 'DELAYED' : 'LIVE'} source="Deribit Public API" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Dealer gamma positioning, strike concentration, and zero-gamma flip regime
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 font-mono text-xs">
            <button
              onClick={() => {
                setSelectedCurrency('BTC');
                onSelectSymbol('BTCUSDT');
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCurrency === 'BTC' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              BTC Options
            </button>
            <button
              onClick={() => {
                setSelectedCurrency('ETH');
                onSelectSymbol('ETHUSDT');
              }}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCurrency === 'ETH' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ETH Options
            </button>
          </div>

          <button
            onClick={() => loadOptions(selectedCurrency)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Gamma Regime & Key Metrics Cards */}
      {gexData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard noPadding className="p-4 border-cyan-500/20">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Dealer Gamma Regime</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider ${
                isPositiveGamma 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isPositiveGamma ? 'POSITIVE GAMMA (LONG)' : 'NEGATIVE GAMMA (SHORT)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {isPositiveGamma 
                ? 'Dealers counter-trade market moves. Volatility dampening and range-bound mean reversion expected.' 
                : 'Dealers trade in the direction of the trend. High volatility acceleration and trending moves likely.'}
            </p>
          </GlassCard>

          <GlassCard noPadding className="p-4">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Estimated Zero-Gamma Flip</span>
            <div className="text-xl font-mono-num font-bold text-white mt-1">
              {formatCurrency(gexData.gammaFlipPrice)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Underlying Spot: {formatCurrency(gexData.underlyingPrice)}
            </span>
            <div className="text-[10px] font-mono mt-1 text-cyan-400">
              {gexData.underlyingPrice >= gexData.gammaFlipPrice ? 'Trading above flip level (Safe zone)' : 'Below flip level (Volatile zone)'}
            </div>
          </GlassCard>

          <GlassCard noPadding className="p-4">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Net Gamma Exposure (GEX)</span>
            <div className={`text-xl font-mono-num font-bold mt-1 ${isPositiveGamma ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositiveGamma ? '+' : ''}{formatCompactNumber(gexData.netGexUsd)} USD
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
              <span>Call GEX: +{formatCompactNumber(gexData.totalCallGexUsd)}</span>
              <span>Put GEX: -{formatCompactNumber(gexData.totalPutGexUsd)}</span>
            </div>
          </GlassCard>

          <GlassCard noPadding className="p-4">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Active Expirations</span>
            <div className="text-base font-mono font-bold text-white mt-1">
              {gexData.expirations.length} Expiry Cycles
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {gexData.expirations.slice(0, 4).map((exp) => (
                <span key={exp} className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-mono text-slate-300 border border-white/[0.08]">
                  {exp}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Gamma by Strike Chart & Table */}
      {gexData && (
        <GlassCard
          title={`Estimated Gamma Exposure by Strike (${selectedCurrency})`}
          subtitle="Call Gamma (Blue) vs Put Gamma (Red) across strike prices"
        >
          <div className="space-y-4">
            {/* Visual Bar Distribution */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-2">
              {gexData.strikes.map((s) => {
                const isAtm = Math.abs(s.strike - gexData.underlyingPrice) < (selectedCurrency === 'BTC' ? 1000 : 80);
                const isFlip = Math.abs(s.strike - gexData.gammaFlipPrice) < (selectedCurrency === 'BTC' ? 1000 : 80);

                return (
                  <div
                    key={s.strike}
                    className={`p-2 rounded-xl flex items-center justify-between text-xs font-mono relative overflow-hidden ${
                      isAtm 
                        ? 'bg-cyan-500/10 border border-cyan-400/40' 
                        : isFlip 
                        ? 'bg-amber-500/10 border border-amber-400/40' 
                        : 'bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-32 shrink-0">
                      <span className="font-bold text-white">${s.strike.toLocaleString()}</span>
                      {isAtm && (
                        <span className="text-[9px] px-1 rounded bg-cyan-400 text-black font-bold">ATM</span>
                      )}
                      {isFlip && (
                        <span className="text-[9px] px-1 rounded bg-amber-400 text-black font-bold">FLIP</span>
                      )}
                    </div>

                    {/* Proportional GEX Visual Bars */}
                    <div className="flex-1 flex items-center gap-2 px-3">
                      <div className="flex-1 flex justify-end">
                        <div
                          className="h-3 rounded-l bg-rose-500/60"
                          style={{ width: `${Math.min((s.putGex / (gexData.totalPutGexUsd || 1)) * 300, 100)}%` }}
                        />
                      </div>
                      <div className="w-[1px] h-4 bg-white/20" />
                      <div className="flex-1">
                        <div
                          className="h-3 rounded-r bg-cyan-400/60"
                          style={{ width: `${Math.min((s.callGex / (gexData.totalCallGexUsd || 1)) * 300, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="w-40 text-right shrink-0">
                      <span className={s.netGex >= 0 ? 'text-cyan-400 font-bold' : 'text-rose-400 font-bold'}>
                        {s.netGex >= 0 ? '+' : ''}{formatCompactNumber(s.netGex)} GEX
                      </span>
                      <span className="text-slate-500 text-[10px] block">
                        Call OI: {s.callOi.toFixed(0)} | Put OI: {s.putOi.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formula & Assumptions Footnote per Data Integrity Contract */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/[0.08] text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>CryExc Quantitative GEX Methodology</span>
              </div>
              <p>
                Dollar Gamma Exposure (GEX) is calculated as: <code className="text-white">GEX = Open Interest × Black-76 Gamma × Spot Price × 1% Spot Move</code>. Market makers are modeled as short puts and long calls (standard liquidity provision assumption). Positive gamma regimes dampen realized volatility through systematic delta rebalancing.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
