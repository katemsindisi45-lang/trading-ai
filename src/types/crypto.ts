export type DataStatus = 'LIVE' | 'DELAYED' | 'STALE' | 'DISCONNECTED' | 'UNAVAILABLE' | 'ESTIMATED' | 'HISTORICAL';

export type MarketType = 'SPOT' | 'PERPETUAL' | 'FUTURES' | 'OPTIONS';

export interface MarketTicker {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  marketType: MarketType;
  provider: string;
  openInterest?: number;
  fundingRate?: number;
  nextFundingTime?: number;
  markPrice?: number;
  indexPrice?: number;
  lastUpdated: number;
  status: DataStatus;
}

export interface KlineBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  tradesCount: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
  delta: number; // Taker buy volume - Taker sell volume
}

export interface FootprintPriceLevel {
  price: number;
  bidVol: number; // aggressive sells hitting bid
  askVol: number; // aggressive buys lifting ask
  totalVol: number;
  delta: number; // askVol - bidVol
  isBuyImbalance?: boolean; // askVol > 3x opposing bidVol
  isSellImbalance?: boolean; // bidVol > 3x opposing askVol
}

export interface FootprintCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  candleDelta: number;
  minDelta: number;
  maxDelta: number;
  pocPrice: number; // Point of Control
  pocVolume: number;
  levels: FootprintPriceLevel[];
}

export interface CumulativeVolumeDeltaPoint {
  timestamp: number;
  price: number;
  cvd: number;
  delta: number;
}

export interface AbsorptionSignal {
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  side: 'BUY_ABSORPTION' | 'SELL_ABSORPTION';
  aggressiveVolume: number;
  passiveWallDepth: number;
  priceReaction: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  defenseLevel: number;
  invalidationLevel: number;
  status: 'ACTIVE' | 'CONFIRMED' | 'INVALIDATED';
  description: string;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  depthPercent: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
  timestamp: number;
  status: DataStatus;
}

export interface OptionsContract {
  instrumentName: string;
  strike: number;
  expiration: string;
  expirationTimestamp: number;
  type: 'CALL' | 'PUT';
  openInterest: number;
  markPrice: number;
  markIv: number;
  bidIv?: number;
  askIv?: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  volume24h: number;
  underlyingPrice: number;
}

export interface GammaExposureMetrics {
  currency: 'BTC' | 'ETH';
  underlyingPrice: number;
  totalCallGexUsd: number;
  totalPutGexUsd: number;
  netGexUsd: number;
  gammaFlipPrice: number;
  gammaRegime: 'POSITIVE_GAMMA' | 'NEGATIVE_GAMMA';
  maxPainPrice: number;
  strikes: {
    strike: number;
    callOi: number;
    putOi: number;
    callGex: number;
    putGex: number;
    netGex: number;
    callIv: number;
    putIv: number;
  }[];
  expirations: string[];
  lastUpdated: number;
  status: DataStatus;
}

export interface OptionFlowTrade {
  id: string;
  timestamp: number;
  currency: 'BTC' | 'ETH';
  contractName: string;
  strike: number;
  expiry: string;
  type: 'CALL' | 'PUT';
  side: 'BUY' | 'SELL';
  flowType: 'SWEEP' | 'BLOCK' | 'SPLIT';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  premiumUsd: number;
  contracts: number;
  iv: number;
  spotPriceAtTrade: number;
  details: string;
}

export interface CryptoFundamentals {
  symbol: string;
  name: string;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  marketCapUsd: number;
  fdvUsd: number;
  tvlUsd?: number;
  activeAddresses24h?: number;
  dailyTransactions?: number;
  protocolRevenue30dUsd?: number;
  stakingRatio?: number;
  whaleInflows24hUsd?: number;
  whaleOutflows24hUsd?: number;
  consensusMechanism: string;
  inflationRatePercent: number;
  nextHalvingOrUnlockDate?: string;
  healthScore: number;
  status: DataStatus;
  lastUpdated: number;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'REGULATORY' | 'MACRO' | 'EXCHANGE' | 'PROTOCOL' | 'ETF' | 'SECURITY';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
}

export interface AiMarketSynthesis {
  asset: string;
  timeframe: string;
  regime: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL_COMPRESSED' | 'VOLATILITY_EXPANSION';
  confidenceScore: number;
  bullishEvidence: string[];
  bearishEvidence: string[];
  orderFlowContext: string;
  gammaContext: string;
  fundamentalContext: string;
  macroContext: string;
  keySupportLevels: number[];
  keyResistanceLevels: number[];
  invalidationTrigger: string;
  potentialScenarios: {
    title: string;
    probability: string;
    target: number;
    condition: string;
  }[];
  missingDataNotes: string[];
  timestamp: string;
}

export interface UserWatchlistItem {
  symbol: string;
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface UserAlert {
  id: string;
  userId: string;
  symbol: string;
  metric: string;
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'DIVERGENCE' | 'ABSORPTION';
  targetValue: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'MUTED';
  createdAt: string;
}

export interface SignalPlusTradeSetup {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD_WATCH';
  confidence: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number; // 1:5 R:R target
  takeProfitTargets: {
    tp1: number; // 1:2
    tp2: number; // 1:3.5
    tp3: number; // 1:5
  };
  riskRewardRatio: string; // "1 : 5.0"
  riskAmountUsd: number;
  rewardAmountUsd: number;
  summary: string;
  reasons: {
    orderFlow: string;
    gammaGex: string;
    technicalStructure: string;
  };
  invalidation: string;
  timestamp: string;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOPPED_OUT' | 'WATCHING';
}

export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'WIN' | 'LOSS' | 'OPEN' | 'BREAK_EVEN';

export interface TradeRecord {
  id: string;
  userId?: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: string;
  riskAmountUsd: number;
  pnlUsd?: number;
  pnlR?: number;
  status: TradeStatus;
  date: string; // YYYY-MM-DD
  openedAt: string;
  closedAt?: string;
  notes?: string;
  setupSource: string;
  exitReason?: string;
  timeframe?: string;
  chartSnapshotUrl?: string;
}

export interface DailyPerformance {
  date: string; // YYYY-MM-DD
  formattedDate: string;
  totalTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  lossRate: number;
  netPnlUsd: number;
  netPnlR: number;
  trades: TradeRecord[];
}

export interface OverallTradingStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  totalWins: number;
  totalLosses: number;
  totalBreakEvens: number;
  winRate: number;
  lossRate: number;
  breakEvenRate: number;
  netPnlUsd: number;
  netPnlR: number;
  grossProfitUsd: number;
  grossLossUsd: number;
  profitFactor: number;
  avgWinUsd: number;
  avgLossUsd: number;
  avgWinR: number;
  avgLossR: number;
  winLossRatio: number;
  currentStreak: {
    type: 'WIN' | 'LOSS' | 'NONE';
    count: number;
  };
  bestTradeUsd: number;
  worstTradeUsd: number;
  bestDay: { date: string; pnlUsd: number; winRate: number } | null;
  worstDay: { date: string; pnlUsd: number; winRate: number } | null;
}
