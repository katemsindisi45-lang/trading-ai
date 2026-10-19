import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  TradeRecord, 
  DailyPerformance, 
  OverallTradingStats, 
  TradeStatus 
} from '../types/crypto';

const LOCAL_STORAGE_KEY = 'cryexc_trade_history_v2';

/**
 * Institutional Seed Trades with realistic 1:5 Risk-to-Reward setups,
 * distributed across multiple days to track everyday losses and wins.
 */
export const DEFAULT_SEED_TRADES: TradeRecord[] = [
  // Today (2026-10-18) - 3 Trades: 2 Wins, 1 Loss (66.7% Win Rate)
  {
    id: 'tr-1018-1',
    symbol: 'BTCUSDT',
    side: 'BUY',
    entryPrice: 84250,
    exitPrice: 87800,
    stopLoss: 83540,
    takeProfit: 87800,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 300,
    pnlUsd: 1500,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-18',
    openedAt: '2026-10-18T01:15:00Z',
    closedAt: '2026-10-18T05:30:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Absorption block breakout above $84k POC. Cumulative delta confirmed aggressive buyer intake.',
  },
  {
    id: 'tr-1018-2',
    symbol: 'SOLUSDT',
    side: 'BUY',
    entryPrice: 172.5,
    exitPrice: 188.0,
    stopLoss: 169.4,
    takeProfit: 188.0,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 250,
    pnlUsd: 1250,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-18',
    openedAt: '2026-10-18T03:40:00Z',
    closedAt: '2026-10-18T08:10:00Z',
    setupSource: 'Photo Chart Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Uploaded 4h chart screenshot. Bullish flag breakout above 200 EMA + positive funding expansion.',
  },
  {
    id: 'tr-1018-3',
    symbol: 'ETHUSDT',
    side: 'SELL',
    entryPrice: 3120,
    exitPrice: 3156,
    stopLoss: 3156,
    takeProfit: 2940,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 250,
    pnlUsd: -250,
    pnlR: -1.0,
    status: 'LOSS',
    date: '2026-10-18',
    openedAt: '2026-10-18T06:20:00Z',
    closedAt: '2026-10-18T07:45:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit Stop Loss (-1.0R)',
    notes: 'Bearish rejection at value area high failed. Dealer gamma flip squeezed short positions.',
  },
  {
    id: 'tr-1018-4',
    symbol: 'SUIUSDT',
    side: 'BUY',
    entryPrice: 2.35,
    stopLoss: 2.24,
    takeProfit: 2.90,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 200,
    pnlUsd: 0,
    pnlR: 0,
    status: 'OPEN',
    date: '2026-10-18',
    openedAt: '2026-10-18T09:10:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    notes: 'Current active trade setup. Volume profile VPOC support held firmly with positive CVD divergence.',
  },

  // Yesterday (2026-10-17) - 4 Trades: 3 Wins, 1 Loss (75.0% Win Rate)
  {
    id: 'tr-1017-1',
    symbol: 'BTCUSDT',
    side: 'SELL',
    entryPrice: 85600,
    exitPrice: 82400,
    stopLoss: 86240,
    takeProfit: 82400,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 350,
    pnlUsd: 1750,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-17',
    openedAt: '2026-10-17T08:00:00Z',
    closedAt: '2026-10-17T16:20:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Exhaustion wick at $85.6k major call resistance wall. Negative dealer gamma accelerated the dump.',
  },
  {
    id: 'tr-1017-2',
    symbol: 'BNBUSDT',
    side: 'BUY',
    entryPrice: 590,
    exitPrice: 625,
    stopLoss: 583,
    takeProfit: 625,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 200,
    pnlUsd: 1000,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-17',
    openedAt: '2026-10-17T11:15:00Z',
    closedAt: '2026-10-17T18:40:00Z',
    setupSource: 'Photo Chart Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Ascending triangle chart scanned with tight invalidation below 583 swing low.',
  },
  {
    id: 'tr-1017-3',
    symbol: 'AVAXUSDT',
    side: 'BUY',
    entryPrice: 28.5,
    exitPrice: 27.8,
    stopLoss: 27.8,
    takeProfit: 32.0,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 200,
    pnlUsd: -200,
    pnlR: -1.0,
    status: 'LOSS',
    date: '2026-10-17',
    openedAt: '2026-10-17T14:00:00Z',
    closedAt: '2026-10-17T15:10:00Z',
    setupSource: 'Manual Setup',
    exitReason: 'Hit Stop Loss (-1.0R)',
    notes: 'Attempted counter-trend bounce on support. Liquidations pushed price through stop loss.',
  },
  {
    id: 'tr-1017-4',
    symbol: 'SOLUSDT',
    side: 'BUY',
    entryPrice: 165.0,
    exitPrice: 175.0,
    stopLoss: 163.0,
    takeProfit: 175.0,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 250,
    pnlUsd: 1250,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-17',
    openedAt: '2026-10-17T19:30:00Z',
    closedAt: '2026-10-17T23:50:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'High volume retest of $165 value area. Aggressive limit bid stacking on footprint order book.',
  },

  // 2026-10-16 - 3 Trades: 2 Wins, 1 Loss (66.7% Win Rate)
  {
    id: 'tr-1016-1',
    symbol: 'ETHUSDT',
    side: 'BUY',
    entryPrice: 2980,
    exitPrice: 3145,
    stopLoss: 2947,
    takeProfit: 3145,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 300,
    pnlUsd: 1500,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-16',
    openedAt: '2026-10-16T04:20:00Z',
    closedAt: '2026-10-16T12:00:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Triple bottom sweep at round psychological 2980 with massive spot delta absorption.',
  },
  {
    id: 'tr-1016-2',
    symbol: 'DOGEUSDT',
    side: 'BUY',
    entryPrice: 0.142,
    exitPrice: 0.138,
    stopLoss: 0.138,
    takeProfit: 0.162,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 150,
    pnlUsd: -150,
    pnlR: -1.0,
    status: 'LOSS',
    date: '2026-10-16',
    openedAt: '2026-10-16T13:10:00Z',
    closedAt: '2026-10-16T14:35:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit Stop Loss (-1.0R)',
    notes: 'Momentum breakout attempt failed to hold VWAP.',
  },
  {
    id: 'tr-1016-3',
    symbol: 'BTCUSDT',
    side: 'BUY',
    entryPrice: 82100,
    exitPrice: 85200,
    stopLoss: 81480,
    takeProfit: 85200,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 400,
    pnlUsd: 2000,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-16',
    openedAt: '2026-10-16T16:00:00Z',
    closedAt: '2026-10-16T22:30:00Z',
    setupSource: 'Photo Chart Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Clean Wyckoff spring pattern identified from uploaded chart screenshot.',
  },

  // 2026-10-15 - 3 Trades: 2 Wins, 1 Break-Even (100% Non-Loss, 66.7% Win Rate)
  {
    id: 'tr-1015-1',
    symbol: 'SOLUSDT',
    side: 'BUY',
    entryPrice: 158.0,
    exitPrice: 173.0,
    stopLoss: 155.0,
    takeProfit: 173.0,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 250,
    pnlUsd: 1250,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-15',
    openedAt: '2026-10-15T07:15:00Z',
    closedAt: '2026-10-15T15:20:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Deribit call skew flipped heavily positive; gamma pin opened up upside trajectory.',
  },
  {
    id: 'tr-1015-2',
    symbol: 'LINKUSDT',
    side: 'BUY',
    entryPrice: 14.2,
    exitPrice: 14.2,
    stopLoss: 13.8,
    takeProfit: 16.2,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 150,
    pnlUsd: 0,
    pnlR: 0,
    status: 'BREAK_EVEN',
    date: '2026-10-15',
    openedAt: '2026-10-15T10:40:00Z',
    closedAt: '2026-10-15T13:00:00Z',
    setupSource: 'Order Flow',
    exitReason: 'Trailing Stop to Breakeven (0.0R)',
    notes: 'Reached TP1 (1:2) and moved stop to breakeven before choppy consolidation.',
  },
  {
    id: 'tr-1015-3',
    symbol: 'ETHUSDT',
    side: 'SELL',
    entryPrice: 3080,
    exitPrice: 2940,
    stopLoss: 3108,
    takeProfit: 2940,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 300,
    pnlUsd: 1500,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-15',
    openedAt: '2026-10-15T17:00:00Z',
    closedAt: '2026-10-15T21:40:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Massive open interest flush on perpetuals with negative delta continuation.',
  },

  // 2026-10-14 - 3 Trades: 1 Win, 2 Losses (33.3% Win Rate, but Still Net Profitable due to 1:5 R:R!)
  {
    id: 'tr-1014-1',
    symbol: 'BTCUSDT',
    side: 'BUY',
    entryPrice: 83500,
    exitPrice: 82900,
    stopLoss: 82900,
    takeProfit: 86500,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 300,
    pnlUsd: -300,
    pnlR: -1.0,
    status: 'LOSS',
    date: '2026-10-14',
    openedAt: '2026-10-14T02:00:00Z',
    closedAt: '2026-10-14T04:10:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit Stop Loss (-1.0R)',
    notes: 'Asia session false breakout.',
  },
  {
    id: 'tr-1014-2',
    symbol: 'SOLUSDT',
    side: 'SELL',
    entryPrice: 162.0,
    exitPrice: 164.5,
    stopLoss: 164.5,
    takeProfit: 149.5,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 200,
    pnlUsd: -200,
    pnlR: -1.0,
    status: 'LOSS',
    date: '2026-10-14',
    openedAt: '2026-10-14T09:30:00Z',
    closedAt: '2026-10-14T11:00:00Z',
    setupSource: 'Manual Setup',
    exitReason: 'Hit Stop Loss (-1.0R)',
    notes: 'Attempted short into high volume node.',
  },
  {
    id: 'tr-1014-3',
    symbol: 'BTCUSDT',
    side: 'BUY',
    entryPrice: 82600,
    exitPrice: 85600,
    stopLoss: 82000,
    takeProfit: 85600,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 350,
    pnlUsd: 1750,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-14',
    openedAt: '2026-10-14T14:40:00Z',
    closedAt: '2026-10-14T20:15:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Power of 1:5 R:R in action: 1 win (+5.0R) erased 2 losses (-2.0R), yielding +3.0R net profit on a 33% win day!',
  },

  // 2026-10-13 - 2 Trades: 2 Wins, 0 Losses (100% Win Rate)
  {
    id: 'tr-1013-1',
    symbol: 'SUIUSDT',
    side: 'BUY',
    entryPrice: 2.10,
    exitPrice: 2.60,
    stopLoss: 2.00,
    takeProfit: 2.60,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 200,
    pnlUsd: 1000,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-13',
    openedAt: '2026-10-13T08:20:00Z',
    closedAt: '2026-10-13T16:00:00Z',
    setupSource: 'Signal Plus 1:5 Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Ecosystem catalyst run. Strong bid imbalance in order book depth.',
  },
  {
    id: 'tr-1013-2',
    symbol: 'ETHUSDT',
    side: 'BUY',
    entryPrice: 2890,
    exitPrice: 3040,
    stopLoss: 2860,
    takeProfit: 3040,
    riskRewardRatio: '1 : 5.0',
    riskAmountUsd: 300,
    pnlUsd: 1500,
    pnlR: 5.0,
    status: 'WIN',
    date: '2026-10-13',
    openedAt: '2026-10-13T12:00:00Z',
    closedAt: '2026-10-13T19:30:00Z',
    setupSource: 'Photo Chart Scanner',
    exitReason: 'Hit TP3 Target (1:5.0 R:R)',
    notes: 'Double bottom confirmed by AI screenshot scan with high confidence rating (94%).',
  },
];

/**
 * Load initial trade history from localStorage or seed
 */
export function loadLocalTrades(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read trade history from localStorage:', err);
  }

  // Save seed to localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_TRADES));
  } catch (e) {
    // Ignore storage quota
  }
  return DEFAULT_SEED_TRADES;
}

/**
 * Save trade history to localStorage
 */
export function saveLocalTrades(trades: TradeRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.warn('Could not save trades to localStorage:', err);
  }
}

/**
 * Load trades from Firestore for authenticated user, merging with local
 */
export async function loadFirestoreTrades(userId: string): Promise<TradeRecord[]> {
  try {
    const tradesRef = collection(db, 'users', userId, 'trades');
    const q = query(tradesRef, orderBy('openedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Sync local or seed trades up to Firestore
      const initial = loadLocalTrades();
      for (const t of initial) {
        await setDoc(doc(db, 'users', userId, 'trades', t.id), {
          ...t,
          userId,
        });
      }
      return initial;
    }

    const fetchedTrades: TradeRecord[] = [];
    snapshot.forEach((docSnap) => {
      fetchedTrades.push(docSnap.data() as TradeRecord);
    });
    // Save to local cache
    saveLocalTrades(fetchedTrades);
    return fetchedTrades;
  } catch (err) {
    console.warn('Failed to fetch trades from Firestore, using local fallback:', err);
    return loadLocalTrades();
  }
}

/**
 * Persist a single trade (Create / Update)
 */
export async function persistTrade(trade: TradeRecord, userId?: string | null): Promise<void> {
  // 1. Update localStorage
  const current = loadLocalTrades();
  const index = current.findIndex((t) => t.id === trade.id);
  if (index >= 0) {
    current[index] = trade;
  } else {
    current.unshift(trade);
  }
  saveLocalTrades(current);

  // 2. If authenticated, sync with Firestore
  if (userId) {
    try {
      await setDoc(doc(db, 'users', userId, 'trades', trade.id), {
        ...trade,
        userId,
      });
    } catch (err) {
      console.warn('Firestore write trade error (local fallback active):', err);
    }
  }
}

/**
 * Delete a trade
 */
export async function removeTrade(tradeId: string, userId?: string | null): Promise<TradeRecord[]> {
  const current = loadLocalTrades().filter((t) => t.id !== tradeId);
  saveLocalTrades(current);

  if (userId) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'trades', tradeId));
    } catch (err) {
      console.warn('Firestore delete trade error:', err);
    }
  }

  return current;
}

/**
 * Calculate full performance statistics across all historical trades
 */
export function calculateOverallStats(trades: TradeRecord[]): OverallTradingStats {
  const closed = trades.filter((t) => t.status !== 'OPEN');
  const openTrades = trades.filter((t) => t.status === 'OPEN').length;
  const totalTrades = trades.length;
  const closedTrades = closed.length;

  const wins = closed.filter((t) => t.status === 'WIN');
  const losses = closed.filter((t) => t.status === 'LOSS');
  const breakEvens = closed.filter((t) => t.status === 'BREAK_EVEN');

  const totalWins = wins.length;
  const totalLosses = losses.length;
  const totalBreakEvens = breakEvens.length;

  const winRate = closedTrades > 0 ? (totalWins / closedTrades) * 100 : 0;
  const lossRate = closedTrades > 0 ? (totalLosses / closedTrades) * 100 : 0;
  const breakEvenRate = closedTrades > 0 ? (totalBreakEvens / closedTrades) * 100 : 0;

  let netPnlUsd = 0;
  let netPnlR = 0;
  let grossProfitUsd = 0;
  let grossLossUsd = 0;
  let bestTradeUsd = 0;
  let worstTradeUsd = 0;

  for (const t of closed) {
    const pnl = t.pnlUsd || 0;
    const r = t.pnlR || 0;
    netPnlUsd += pnl;
    netPnlR += r;

    if (pnl > 0) {
      grossProfitUsd += pnl;
      if (pnl > bestTradeUsd) bestTradeUsd = pnl;
    } else if (pnl < 0) {
      grossLossUsd += Math.abs(pnl);
      if (pnl < worstTradeUsd) worstTradeUsd = pnl;
    }
  }

  const profitFactor = grossLossUsd > 0 ? grossProfitUsd / grossLossUsd : grossProfitUsd > 0 ? 99.9 : 0;
  const avgWinUsd = totalWins > 0 ? grossProfitUsd / totalWins : 0;
  const avgLossUsd = totalLosses > 0 ? grossLossUsd / totalLosses : 0;
  const winLossRatio = avgLossUsd > 0 ? avgWinUsd / avgLossUsd : avgWinUsd > 0 ? 5.0 : 0;

  const totalWinR = wins.reduce((acc, t) => acc + (t.pnlR || 0), 0);
  const totalLossR = losses.reduce((acc, t) => acc + Math.abs(t.pnlR || 0), 0);
  const avgWinR = totalWins > 0 ? totalWinR / totalWins : 0;
  const avgLossR = totalLosses > 0 ? totalLossR / totalLosses : 0;

  // Calculate Streak (based on chronologically sorted closed trades)
  const sortedClosed = [...closed].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  );

  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let streakCount = 0;

  if (sortedClosed.length > 0) {
    const latest = sortedClosed[0].status;
    if (latest === 'WIN' || latest === 'LOSS') {
      streakType = latest;
      for (const t of sortedClosed) {
        if (t.status === streakType) {
          streakCount++;
        } else {
          break;
        }
      }
    }
  }

  // Group by day to compute best day and worst day
  const dailyGroups = groupTradesByDay(trades);
  let bestDay: { date: string; pnlUsd: number; winRate: number } | null = null;
  let worstDay: { date: string; pnlUsd: number; winRate: number } | null = null;

  for (const day of dailyGroups) {
    if (day.totalTrades === 0) continue;
    if (!bestDay || day.netPnlUsd > bestDay.pnlUsd) {
      bestDay = { date: day.date, pnlUsd: day.netPnlUsd, winRate: day.winRate };
    }
    if (!worstDay || day.netPnlUsd < worstDay.pnlUsd) {
      worstDay = { date: day.date, pnlUsd: day.netPnlUsd, winRate: day.winRate };
    }
  }

  return {
    totalTrades,
    closedTrades,
    openTrades,
    totalWins,
    totalLosses,
    totalBreakEvens,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    breakEvenRate: Number(breakEvenRate.toFixed(1)),
    netPnlUsd: Number(netPnlUsd.toFixed(2)),
    netPnlR: Number(netPnlR.toFixed(1)),
    grossProfitUsd: Number(grossProfitUsd.toFixed(2)),
    grossLossUsd: Number(grossLossUsd.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWinUsd: Number(avgWinUsd.toFixed(2)),
    avgLossUsd: Number(avgLossUsd.toFixed(2)),
    avgWinR: Number(avgWinR.toFixed(1)),
    avgLossR: Number(avgLossR.toFixed(1)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    currentStreak: {
      type: streakType,
      count: streakCount,
    },
    bestTradeUsd,
    worstTradeUsd,
    bestDay,
    worstDay,
  };
}

/**
 * Group trades by day to track everyday losses and wins
 */
export function groupTradesByDay(trades: TradeRecord[]): DailyPerformance[] {
  const groups: { [date: string]: TradeRecord[] } = {};

  trades.forEach((t) => {
    const d = t.date || t.openedAt.slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  return sortedDates.map((date) => {
    const dayTrades = groups[date];
    const closed = dayTrades.filter((t) => t.status !== 'OPEN');
    const wins = closed.filter((t) => t.status === 'WIN').length;
    const losses = closed.filter((t) => t.status === 'LOSS').length;
    const breakEvens = closed.filter((t) => t.status === 'BREAK_EVEN').length;

    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const lossRate = closed.length > 0 ? (losses / closed.length) * 100 : 0;

    let netPnlUsd = 0;
    let netPnlR = 0;
    closed.forEach((t) => {
      netPnlUsd += t.pnlUsd || 0;
      netPnlR += t.pnlR || 0;
    });

    let formattedDate = date;
    if (date === todayStr) {
      formattedDate = 'Today';
    } else if (date === yesterdayStr) {
      formattedDate = 'Yesterday';
    } else {
      try {
        const [year, month, day] = date.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
        formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        formattedDate = date;
      }
    }

    return {
      date,
      formattedDate,
      totalTrades: dayTrades.length,
      wins,
      losses,
      breakEvens,
      winRate: Number(winRate.toFixed(1)),
      lossRate: Number(lossRate.toFixed(1)),
      netPnlUsd: Number(netPnlUsd.toFixed(2)),
      netPnlR: Number(netPnlR.toFixed(1)),
      trades: dayTrades.sort(
        (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
      ),
    };
  });
}

/**
 * Format CSV export of trade history
 */
export function exportTradesToCsv(trades: TradeRecord[]): void {
  const headers = [
    'Trade ID',
    'Date',
    'Opened At',
    'Closed At',
    'Symbol',
    'Side',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit (1:5)',
    'Risk ($)',
    'Status',
    'Realized PnL ($)',
    'Realized R',
    'Exit Reason',
    'Setup Source',
    'Notes',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.date,
    t.openedAt,
    t.closedAt || '',
    t.symbol,
    t.side,
    t.entryPrice,
    t.exitPrice || '',
    t.stopLoss,
    t.takeProfit,
    t.riskAmountUsd,
    t.status,
    t.pnlUsd ?? '',
    t.pnlR ?? '',
    `"${(t.exitReason || '').replace(/"/g, '""')}"`,
    `"${(t.setupSource || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CryExc_Trade_History_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
