import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  History, 
  Plus, 
  Filter, 
  Download, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Target, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  BarChart3,
  Layers,
  Sparkles,
  Percent,
  X
} from 'lucide-react';
import { 
  TradeRecord, 
  TradeStatus, 
  TradeSide, 
  DailyPerformance, 
  OverallTradingStats 
} from '../../types/crypto';
import { 
  calculateOverallStats, 
  groupTradesByDay, 
  exportTradesToCsv, 
  persistTrade, 
  removeTrade, 
  DEFAULT_SEED_TRADES 
} from '../../services/tradeHistoryService';
import { formatCurrency } from '../../services/marketApi';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';

interface TradeJournalWorkspaceProps {
  trades: TradeRecord[];
  onTradesChange: (trades: TradeRecord[]) => void;
  userId?: string | null;
  onNavigateToSignals?: (symbol?: string) => void;
}

export const TradeJournalWorkspace: React.FC<TradeJournalWorkspaceProps> = ({
  trades,
  onTradesChange,
  userId,
  onNavigateToSignals,
}) => {
  // Navigation / View states
  const [activeView, setActiveView] = useState<'everyday' | 'history'>('everyday');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'OPEN' | 'BREAK_EVEN'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<TradeRecord | null>(null);

  // New Trade Form state
  const [newSymbol, setNewSymbol] = useState<string>('BTCUSDT');
  const [newSide, setNewSide] = useState<TradeSide>('BUY');
  const [newEntryPrice, setNewEntryPrice] = useState<string>('85000');
  const [newStopLoss, setNewStopLoss] = useState<string>('84000');
  const [newTakeProfit, setNewTakeProfit] = useState<string>('90000');
  const [newRiskAmount, setNewRiskAmount] = useState<string>('250');
  const [newStatus, setNewStatus] = useState<TradeStatus>('OPEN');
  const [newSource, setNewSource] = useState<string>('Signal Plus 1:5 Scanner');
  const [newNotes, setNewNotes] = useState<string>('');

  // Auto-calculate 1:5 R:R target helper for new trade
  const handleAutoCalculate1to5 = () => {
    const entry = parseFloat(newEntryPrice);
    const sl = parseFloat(newStopLoss);
    if (!entry || !sl || entry <= 0 || sl <= 0) return;

    if (newSide === 'BUY') {
      const risk = entry - sl;
      if (risk > 0) {
        const tp = entry + risk * 5.0;
        setNewTakeProfit(tp.toFixed(entry < 10 ? 4 : 2));
      }
    } else {
      const risk = sl - entry;
      if (risk > 0) {
        const tp = entry - risk * 5.0;
        setNewTakeProfit(tp.toFixed(entry < 10 ? 4 : 2));
      }
    }
  };

  // Stats computation
  const stats: OverallTradingStats = useMemo(() => {
    return calculateOverallStats(trades);
  }, [trades]);

  // Everyday breakdown computation
  const dailyGroups: DailyPerformance[] = useMemo(() => {
    return groupTradesByDay(trades);
  }, [trades]);

  // Filtered trades for history list
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchSource = t.setupSource?.toLowerCase().includes(q);
        if (!matchSymbol && !matchNotes && !matchSource) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Side
      if (sideFilter !== 'ALL' && t.side !== sideFilter) return false;

      // Date Range
      if (dateRangeFilter !== 'ALL') {
        const tradeDate = new Date(t.openedAt).getTime();
        const now = Date.now();
        if (dateRangeFilter === 'TODAY') {
          const todayStr = new Date().toISOString().slice(0, 10);
          if (t.date !== todayStr) return false;
        } else if (dateRangeFilter === '7D') {
          if (now - tradeDate > 7 * 86400 * 1000) return false;
        } else if (dateRangeFilter === '30D') {
          if (now - tradeDate > 30 * 86400 * 1000) return false;
        }
      }

      return true;
    });
  }, [trades, searchQuery, statusFilter, sideFilter, dateRangeFilter]);

  // Quick Close Trade Action
  const handleQuickCloseTrade = async (
    trade: TradeRecord, 
    outcome: 'WIN' | 'LOSS' | 'BREAK_EVEN'
  ) => {
    const risk = trade.riskAmountUsd || 250;
    let pnlUsd = 0;
    let pnlR = 0;
    let exitPrice = trade.entryPrice;
    let exitReason = 'Manual Close';

    if (outcome === 'WIN') {
      pnlR = 5.0;
      pnlUsd = risk * 5.0;
      exitPrice = trade.takeProfit;
      exitReason = 'Hit TP3 Target (1:5.0 R:R)';
    } else if (outcome === 'LOSS') {
      pnlR = -1.0;
      pnlUsd = -risk;
      exitPrice = trade.stopLoss;
      exitReason = 'Hit Stop Loss (-1.0R)';
    } else {
      pnlR = 0;
      pnlUsd = 0;
      exitPrice = trade.entryPrice;
      exitReason = 'Break-even Exit (0.0R)';
    }

    const updated: TradeRecord = {
      ...trade,
      status: outcome,
      exitPrice,
      pnlUsd,
      pnlR,
      exitReason,
      closedAt: new Date().toISOString(),
    };

    await persistTrade(updated, userId);
    const newTradesList = trades.map((t) => (t.id === trade.id ? updated : t));
    onTradesChange(newTradesList);
  };

  // Delete Trade Action
  const handleDeleteTrade = async (id: string) => {
    const remaining = await removeTrade(id, userId);
    onTradesChange(remaining);
    if (selectedTradeForDetail?.id === id) {
      setSelectedTradeForDetail(null);
    }
  };

  // Reset to default institutional seed trades
  const handleResetTrades = () => {
    if (window.confirm('Reset trade history to institutional sample dataset?')) {
      localStorage.setItem('cryexc_trade_history_v2', JSON.stringify(DEFAULT_SEED_TRADES));
      onTradesChange(DEFAULT_SEED_TRADES);
    }
  };

  // Add Trade Submit
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(newEntryPrice);
    const sl = parseFloat(newStopLoss);
    const tp = parseFloat(newTakeProfit);
    const risk = parseFloat(newRiskAmount) || 200;

    if (!entry || !sl || !tp) {
      alert('Please fill in valid Entry, Stop Loss, and Take Profit prices');
      return;
    }

    let pnlUsd: number | undefined = undefined;
    let pnlR: number | undefined = undefined;
    let exitPrice: number | undefined = undefined;
    let exitReason: string | undefined = undefined;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    if (newStatus === 'WIN') {
      pnlR = 5.0;
      pnlUsd = risk * 5.0;
      exitPrice = tp;
      exitReason = 'Hit TP3 Target (1:5.0 R:R)';
    } else if (newStatus === 'LOSS') {
      pnlR = -1.0;
      pnlUsd = -risk;
      exitPrice = sl;
      exitReason = 'Hit Stop Loss (-1.0R)';
    } else if (newStatus === 'BREAK_EVEN') {
      pnlR = 0;
      pnlUsd = 0;
      exitPrice = entry;
      exitReason = 'Closed at Break-even';
    }

    const newTrade: TradeRecord = {
      id: `tr-${Date.now()}`,
      symbol: newSymbol.toUpperCase(),
      side: newSide,
      entryPrice: entry,
      exitPrice,
      stopLoss: sl,
      takeProfit: tp,
      riskRewardRatio: '1 : 5.0',
      riskAmountUsd: risk,
      pnlUsd,
      pnlR,
      status: newStatus,
      date: todayStr,
      openedAt: nowIso,
      closedAt: newStatus !== 'OPEN' ? nowIso : undefined,
      notes: newNotes,
      setupSource: newSource,
      exitReason,
      userId: userId || undefined,
    };

    await persistTrade(newTrade, userId);
    onTradesChange([newTrade, ...trades]);
    setIsAddModalOpen(false);

    // Reset fields
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  Trade Journal & Win/Loss Tracker
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME WR & R:R
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track everyday wins, losses, win rates, and 1:5 Risk-to-Reward institutional trade history
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log New Trade
          </button>

          <button
            onClick={() => exportTradesToCsv(trades)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            title="Download CSV export"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleResetTrades}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Reset to verified seed dataset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* 1. Win Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Win Rate
            </span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {stats.winRate}%
            </span>
            <span className="text-[11px] text-slate-400">
              ({stats.totalWins}W)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(stats.winRate, 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Loss Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Loss Rate
            </span>
            <span className="p-1 rounded bg-rose-500/10 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {stats.lossRate}%
            </span>
            <span className="text-[11px] text-slate-400">
              ({stats.totalLosses}L)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(stats.lossRate, 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Realized Net PnL */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Net Realized PnL
            </span>
            <TrendingUp className={`w-3.5 h-3.5 ${stats.netPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="mt-2">
            <div className={`text-xl font-bold font-mono ${stats.netPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.netPnlUsd >= 0 ? '+' : ''}{formatCurrency(stats.netPnlUsd)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Net Return: <span className="font-semibold text-amber-400">{stats.netPnlR >= 0 ? '+' : ''}{stats.netPnlR}R</span>
            </div>
          </div>
        </div>

        {/* 4. Profit Factor */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Profit Factor
            </span>
            <Target className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-cyan-400">
              {stats.profitFactor}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg W: <span className="text-emerald-400 font-mono">+{stats.avgWinR}R</span> | L: <span className="text-rose-400 font-mono">-{stats.avgLossR}R</span>
            </div>
          </div>
        </div>

        {/* 5. Streak & Total Trades */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Current Streak
            </span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold flex items-center gap-1.5">
              {stats.currentStreak.type === 'WIN' ? (
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  🔥 {stats.currentStreak.count} WINS STREAK
                </span>
              ) : stats.currentStreak.type === 'LOSS' ? (
                <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  ❄️ {stats.currentStreak.count} LOSS STREAK
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-xs">Neutral</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.totalTrades} Total ({stats.closedTrades} closed, {stats.openTrades} open)
            </div>
          </div>
        </div>

        {/* 6. 1:5 Asymmetry Edge */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              1:5 Edge Power
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1">
            <div className="text-xs font-semibold text-slate-200">
              Break-Even WR: <span className="text-amber-400 font-mono font-bold">16.7%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">
              At 1:5 R:R, just 1 win covers 5 losses. Your current WR ({stats.winRate}%) generates massive positive expectancy!
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs: Everyday Losses/Wins vs Full Trade History */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('everyday')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'everyday'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Everyday Losses & Wins Tracker
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/20 font-bold">
              {dailyGroups.length} Days
            </span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            All Historical Trades Log
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/20 font-bold">
              {trades.length}
            </span>
          </button>
        </div>

        {/* View toggle badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sync: Dual-Layer (Local + Firestore)</span>
        </div>
      </div>

      {/* VIEW 1: Everyday Losses and Wins Tracker */}
      {activeView === 'everyday' && (
        <div className="space-y-4">
          {/* Daily Performance Timeline Cards */}
          <div className="grid grid-cols-1 gap-4">
            {dailyGroups.map((day) => {
              const isProfitable = day.netPnlUsd >= 0;
              return (
                <div 
                  key={day.date}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                >
                  {/* Day Header Row */}
                  <div className="p-4 bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isProfitable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">
                            {day.formattedDate}
                          </h3>
                          <span className="text-xs text-slate-500 font-mono">
                            ({day.date})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isProfitable 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isProfitable ? `Profitable Day (+${day.netPnlR}R)` : `Drawdown Day (${day.netPnlR}R)`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {day.totalTrades} trade{day.totalTrades !== 1 ? 's' : ''} executed on this day
                        </p>
                      </div>
                    </div>

                    {/* Day Performance Badges */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Daily Win Rate */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          Day Win Rate
                        </div>
                        <div className="text-sm font-bold font-mono text-emerald-400">
                          {day.winRate}% <span className="text-xs text-slate-400 font-normal">({day.wins}W / {day.losses}L)</span>
                        </div>
                      </div>

                      {/* Daily Lose Rate */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          Day Lose Rate
                        </div>
                        <div className="text-sm font-bold font-mono text-rose-400">
                          {day.lossRate}%
                        </div>
                      </div>

                      {/* Daily PnL */}
                      <div className="text-right pl-3 border-l border-slate-700">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          Day Realized PnL
                        </div>
                        <div className={`text-base font-bold font-mono ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfitable ? '+' : ''}{formatCurrency(day.netPnlUsd)}
                          <span className="text-xs text-amber-400 font-semibold ml-1.5">
                            ({day.netPnlR >= 0 ? '+' : ''}{day.netPnlR}R)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day's Trades List */}
                  <div className="divide-y divide-slate-800/60">
                    {day.trades.map((trade) => (
                      <div 
                        key={trade.id}
                        className="p-3.5 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Symbol & Side */}
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[11px] ${
                            trade.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                          </span>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">
                                {trade.symbol}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {trade.riskRewardRatio}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Source: <span className="text-slate-300">{trade.setupSource}</span>
                              {trade.notes && (
                                <span className="ml-2 text-slate-400 italic">
                                  — "{trade.notes.slice(0, 75)}{trade.notes.length > 75 ? '...' : ''}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price Execution Coordinates */}
                        <div className="flex items-center gap-4 text-slate-300 font-mono">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Entry</span>
                            <span className="font-medium">${trade.entryPrice.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Exit / TP3</span>
                            <span className="font-medium">${(trade.exitPrice || trade.takeProfit).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Stop Loss</span>
                            <span className="text-rose-400/80 font-medium">${trade.stopLoss.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Status & Realized R/PnL */}
                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <div className="text-right">
                            {trade.status === 'WIN' && (
                              <div>
                                <span className="px-2 py-0.5 rounded font-bold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  WIN (+{trade.pnlR}R)
                                </span>
                                <div className="text-emerald-400 font-bold font-mono text-xs mt-0.5">
                                  +{formatCurrency(trade.pnlUsd || 0)}
                                </div>
                              </div>
                            )}

                            {trade.status === 'LOSS' && (
                              <div>
                                <span className="px-2 py-0.5 rounded font-bold text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  LOSS ({trade.pnlR}R)
                                </span>
                                <div className="text-rose-400 font-bold font-mono text-xs mt-0.5">
                                  {formatCurrency(trade.pnlUsd || 0)}
                                </div>
                              </div>
                            )}

                            {trade.status === 'BREAK_EVEN' && (
                              <div>
                                <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-700 text-slate-300 border border-slate-600">
                                  BREAK-EVEN (0.0R)
                                </span>
                                <div className="text-slate-400 font-mono text-xs mt-0.5">
                                  $0.00
                                </div>
                              </div>
                            )}

                            {trade.status === 'OPEN' && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded font-bold text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                                  ACTIVE
                                </span>
                                <button
                                  onClick={() => handleQuickCloseTrade(trade, 'WIN')}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                  title="Mark as 1:5 Win (+5R)"
                                >
                                  +5R Win
                                </button>
                                <button
                                  onClick={() => handleQuickCloseTrade(trade, 'LOSS')}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                                  title="Mark as Stopped Out (-1R)"
                                >
                                  -1R Stop
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Quick delete or view */}
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Trade Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Complete Trade History Log with Advanced Filters */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {/* Controls Bar: Search + Filters */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol, notes, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Status Filter */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {(['ALL', 'WIN', 'LOSS', 'OPEN', 'BREAK_EVEN'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Results' : st}
                  </button>
                ))}
              </div>

              {/* Side Filter */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {(['ALL', 'BUY', 'SELL'] as const).map((sd) => (
                  <button
                    key={sd}
                    onClick={() => setSideFilter(sd)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      sideFilter === sd
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sd === 'ALL' ? 'Both' : sd === 'BUY' ? 'Long' : 'Short'}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Trade History Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Entry</th>
                  <th className="p-3">Exit</th>
                  <th className="p-3">Stop Loss</th>
                  <th className="p-3">TP3 (1:5)</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Realized R</th>
                  <th className="p-3 text-right">Realized PnL</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      No trades found matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    return (
                      <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                          {trade.date}
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          <button
                            onClick={() => onNavigateToSignals?.(trade.symbol)}
                            className="hover:text-emerald-400 transition-colors underline decoration-slate-700"
                          >
                            {trade.symbol}
                          </button>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            trade.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-200">
                          ${trade.entryPrice.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 font-mono text-rose-400/90">
                          ${trade.stopLoss.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-emerald-400/90">
                          ${trade.takeProfit.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          ${trade.riskAmountUsd}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {trade.status === 'WIN' && (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              WIN
                            </span>
                          )}
                          {trade.status === 'LOSS' && (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              LOSS
                            </span>
                          )}
                          {trade.status === 'BREAK_EVEN' && (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-700 text-slate-300">
                              B/E
                            </span>
                          )}
                          {trade.status === 'OPEN' && (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                              OPEN
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">
                          {trade.pnlR !== undefined ? (
                            <span className={`font-bold ${trade.pnlR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {trade.pnlR >= 0 ? '+' : ''}{trade.pnlR}R
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-right whitespace-nowrap">
                          {trade.pnlUsd !== undefined ? (
                            <span className={`font-bold ${trade.pnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {trade.pnlUsd >= 0 ? '+' : ''}{formatCurrency(trade.pnlUsd)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {trade.status === 'OPEN' && (
                              <>
                                <button
                                  onClick={() => handleQuickCloseTrade(trade, 'WIN')}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                                  title="Close as 1:5 Win (+5R)"
                                >
                                  +5R
                                </button>
                                <button
                                  onClick={() => handleQuickCloseTrade(trade, 'LOSS')}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                                  title="Close as Stop Loss (-1R)"
                                >
                                  -1R
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteTrade(trade.id)}
                              className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                              title="Delete trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Log New Trade */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Log Trade Setup to History
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateTrade} className="p-5 space-y-4 text-xs">
              {/* Symbol & Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. BTCUSDT"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Side (Direction)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setNewSide('BUY')}
                      className={`py-1 rounded font-bold text-xs transition-colors ${
                        newSide === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      LONG (BUY)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSide('SELL')}
                      className={`py-1 rounded font-bold text-xs transition-colors ${
                        newSide === 'SELL'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SHORT (SELL)
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Entry & Stop Loss */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Entry Price ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newEntryPrice}
                    onChange={(e) => setNewEntryPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Stop Loss Price ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newStopLoss}
                    onChange={(e) => setNewStopLoss(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-rose-400 font-mono focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              {/* 1:5 Take Profit & Helper */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Take Profit (1:5 Target) ($)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCalculate1to5}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Auto 1:5 R:R Calculator
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={newTakeProfit}
                  onChange={(e) => setNewTakeProfit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Risk Amount & Outcome Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Risk Amount ($)
                  </label>
                  <input
                    type="number"
                    value={newRiskAmount}
                    onChange={(e) => setNewRiskAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Outcome / Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TradeStatus)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="OPEN">ACTIVE / OPEN</option>
                    <option value="WIN">WIN (+5.0R)</option>
                    <option value="LOSS">LOSS (-1.0R)</option>
                    <option value="BREAK_EVEN">BREAK-EVEN (0.0R)</option>
                  </select>
                </div>
              </div>

              {/* Source & Notes */}
              <div>
                <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                  Setup Source
                </label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Signal Plus 1:5 Scanner">Signal Plus 1:5 Scanner</option>
                  <option value="Photo Chart Scanner">Photo Chart Scanner</option>
                  <option value="Order Flow Absorption">Order Flow Absorption</option>
                  <option value="Options Gamma Flip">Options Gamma Flip</option>
                  <option value="Manual Setup">Manual Setup</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                  Reasoning / Notes
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Cumulative delta absorption at VPOC, clear invalidation below swing low"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40"
                >
                  Save Trade Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
