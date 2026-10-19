import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Navbar 
} from './components/layout/Navbar';
import { 
  Sidebar, 
  WorkspaceTab 
} from './components/layout/Sidebar';
import { 
  OverviewWorkspace 
} from './components/overview/OverviewWorkspace';
import { 
  OrderFlowWorkspace 
} from './components/orderflow/OrderFlowWorkspace';
import { 
  SignalPlusWorkspace 
} from './components/signals/SignalPlusWorkspace';
import { 
  TradeJournalWorkspace 
} from './components/journal/TradeJournalWorkspace';
import { 
  ProfessionalChart 
} from './components/charts/ProfessionalChart';
import { 
  OptionsGexWorkspace 
} from './components/options/OptionsGexWorkspace';
import { 
  MarketScanner 
} from './components/scanner/MarketScanner';
import { 
  LiquiditySurface3D 
} from './components/three3d/LiquiditySurface3D';
import { 
  FundamentalsWorkspace 
} from './components/fundamentals/FundamentalsWorkspace';
import { 
  NewsMacroWorkspace 
} from './components/news/NewsMacroWorkspace';
import { 
  AiIntelligenceLab 
} from './components/ai/AiIntelligenceLab';
import { 
  AuthModal 
} from './components/auth/AuthModal';
import { 
  UserDrawer 
} from './components/user/UserDrawer';
import { 
  MarketTicker, 
  OrderBookData, 
  FootprintCandle, 
  AbsorptionSignal, 
  MarketNewsItem, 
  AiMarketSynthesis,
  TradeRecord,
  SignalPlusTradeSetup
} from './types/crypto';
import { 
  fetchTickers, 
  fetchDepth, 
  buildFootprintFromTrades, 
  detectAbsorptionSignals 
} from './services/marketApi';
import { 
  fetchGroundedNews, 
  runMarketAnalysis, 
  generateSpeechAudio 
} from './services/geminiApi';
import { 
  loadLocalTrades, 
  loadFirestoreTrades, 
  persistTrade, 
  calculateOverallStats 
} from './services/tradeHistoryService';
import { 
  auth, 
  testFirestoreConnection 
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [userDrawerOpen, setUserDrawerOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // Trade History & Win/Loss Tracking State (Local + Firestore dual-layer)
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadLocalTrades());

  // Market Data States
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [currentTicker, setCurrentTicker] = useState<MarketTicker | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Array<{ p: string; q: string; m: boolean; T: number }>>([]);
  const [footprintCandles, setFootprintCandles] = useState<FootprintCandle[]>([]);
  const [absorptionSignals, setAbsorptionSignals] = useState<AbsorptionSignal[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Intelligence States
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiMarketSynthesis | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Firebase Auth Listener & Firestore Connection Test
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 1b. Firestore Trades Sync Listener
  useEffect(() => {
    if (user?.uid) {
      loadFirestoreTrades(user.uid).then((loaded) => {
        if (loaded && loaded.length > 0) {
          setTrades(loaded);
        }
      });
    }
  }, [user]);

  // Log trade handler from Signal Plus
  const handleLogTradeFromSignal = useCallback(async (setup: SignalPlusTradeSetup) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const newTrade: TradeRecord = {
      id: `tr-${Date.now()}`,
      symbol: setup.symbol,
      side: setup.action === 'SELL' ? 'SELL' : 'BUY',
      entryPrice: setup.entryPrice,
      stopLoss: setup.stopLossPrice,
      takeProfit: setup.takeProfitTargets?.tp3 || setup.takeProfitPrice,
      riskRewardRatio: setup.riskRewardRatio || '1 : 5.0',
      riskAmountUsd: setup.riskAmountUsd || 250,
      status: 'OPEN',
      date: todayStr,
      openedAt: nowIso,
      setupSource: 'Signal Plus 1:5 Scanner',
      notes: setup.summary || `1:5 Asymmetric trade setup. Order flow: ${setup.reasons?.orderFlow || 'Congruent delta'}`,
      userId: user?.uid || undefined,
    };

    await persistTrade(newTrade, user?.uid);
    setTrades((prev) => [newTrade, ...prev]);
  }, [user]);

  const overallStats = useMemo(() => calculateOverallStats(trades), [trades]);

  // 2. Fetch Initial Tickers and Grounded News
  const loadTickers = useCallback(async () => {
    try {
      const data = await fetchTickers();
      setTickers(data);
      const current = data.find((t) => t.symbol === selectedSymbol) || data[0];
      if (current) setCurrentTicker(current);
    } catch (err) {
      console.warn('Could not fetch tickers:', err);
    }
  }, [selectedSymbol]);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const items = await fetchGroundedNews();
      setNews(items);
    } catch (err) {
      console.warn('Could not fetch grounded news:', err);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickers();
    loadNews();
    const interval = setInterval(loadTickers, 3000);
    return () => clearInterval(interval);
  }, [loadTickers, loadNews]);

  // 3. High Thinking Market Synthesis
  const handleTriggerAiAnalysis = async () => {
    if (!currentTicker) return;
    setAiLoading(true);
    try {
      const result = await runMarketAnalysis({
        asset: currentTicker.baseAsset,
        currentPrice: currentTicker.price,
        technicals: {
          change24h: currentTicker.priceChangePercent24h,
          high24h: currentTicker.high24h,
          low24h: currentTicker.low24h,
          volume: currentTicker.quoteVolume24h,
        },
        orderFlow: {
          delta: footprintCandles.slice(-1)[0]?.candleDelta || 0,
          status: 'CVD divergence tracking',
        },
        gex: {
          currency: currentTicker.baseAsset === 'ETH' ? 'ETH' : 'BTC',
          status: 'Active GEX monitor',
        },
      });
      setAiAnalysis(result);

      if (ttsEnabled) {
        handlePlaySpeech(`${result.regime}. ${result.orderFlowContext}`);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // 4. TTS Speech Playback
  const handlePlaySpeech = async (text: string) => {
    try {
      const audioUrl = await generateSpeechAudio(text, 'Clear, institutional crypto market anchor');
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('Speech playback error:', err);
    }
  };

  // 5. Real-Time Binance WebSocket Stream for Selected Symbol
  useEffect(() => {
    const sym = selectedSymbol.toLowerCase();
    let ws: WebSocket | null = null;
    let fallbackInterval: any = null;

    // Load initial depth snapshot
    fetchDepth(selectedSymbol)
      .then((d) => setOrderBook(d))
      .catch((e) => console.warn('Depth init error:', e));

    const connectWs = () => {
      try {
        ws = new WebSocket(`wss://fstream.binance.com/ws/${sym}@aggTrade`);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.e === 'aggTrade') {
              const trade = {
                p: data.p,
                q: data.q,
                m: data.m,
                T: data.T,
              };

              // Update latest price on current ticker
              const newPrice = parseFloat(data.p);
              setCurrentTicker((prev) => (prev ? { ...prev, price: newPrice, lastUpdated: Date.now() } : null));

              // Append to recent trades
              setRecentTrades((prev) => {
                const updated = [trade, ...prev.slice(0, 150)];
                // Build footprint candles incrementally
                const candles = buildFootprintFromTrades(updated, 60000, 10);
                setFootprintCandles(candles);
                // Detect passive absorption
                const signals = detectAbsorptionSignals(candles, selectedSymbol);
                setAbsorptionSignals(signals);
                return updated;
              });
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWs();

    // Fallback polling for depth and trades
    fallbackInterval = setInterval(() => {
      fetchDepth(selectedSymbol)
        .then((d) => setOrderBook(d))
        .catch(() => {});
    }, 2000);

    return () => {
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [selectedSymbol]);

  // Handle switching symbols
  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setRecentTrades([]);
    setFootprintCandles([]);
    const found = tickers.find((t) => t.symbol === symbol);
    if (found) setCurrentTicker(found);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F0F5FF] flex flex-col antialiased">
      <audio ref={audioRef} className="hidden" />

      {/* Top Navbar */}
      <Navbar
        currentTicker={currentTicker}
        tickers={tickers}
        onSelectSymbol={handleSelectSymbol}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUserDrawer={() => setUserDrawerOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => setTtsEnabled(!ttsEnabled)}
        wsConnected={wsConnected}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-3 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'overview' && (
            <OverviewWorkspace
              tickers={tickers}
              currentTicker={currentTicker}
              onSelectSymbol={handleSelectSymbol}
              onNavigateTab={setActiveTab}
              news={news}
              aiAnalysis={aiAnalysis}
              onTriggerAiAnalysis={handleTriggerAiAnalysis}
              aiLoading={aiLoading}
              onPlaySpeech={handlePlaySpeech}
            />
          )}

          {activeTab === 'signals' && (
            <SignalPlusWorkspace
              currentTicker={currentTicker}
              tickers={tickers}
              onSelectSymbol={handleSelectSymbol}
              onPlaySpeech={handlePlaySpeech}
              onNavigateToJournal={() => setActiveTab('journal')}
              onLogTrade={handleLogTradeFromSignal}
              overallWinRate={overallStats.winRate}
              todayWinRate={66.7}
            />
          )}

          {activeTab === 'journal' && (
            <TradeJournalWorkspace
              trades={trades}
              onTradesChange={setTrades}
              userId={user?.uid}
              onNavigateToSignals={(symbol) => {
                if (symbol) handleSelectSymbol(symbol);
                setActiveTab('signals');
              }}
            />
          )}

          {activeTab === 'orderflow' && (
            <OrderFlowWorkspace
              currentTicker={currentTicker}
              footprintCandles={footprintCandles}
              orderBook={orderBook}
              absorptionSignals={absorptionSignals}
              recentTrades={recentTrades}
              onRefresh={() => fetchDepth(selectedSymbol).then((d) => setOrderBook(d))}
            />
          )}

          {activeTab === 'charts' && (
            <ProfessionalChart
              currentTicker={currentTicker}
              onRefresh={loadTickers}
            />
          )}

          {activeTab === 'options' && (
            <OptionsGexWorkspace
              currentTicker={currentTicker}
              onSelectSymbol={handleSelectSymbol}
            />
          )}

          {activeTab === 'scanner' && (
            <MarketScanner
              tickers={tickers}
              onSelectSymbol={handleSelectSymbol}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'three3d' && (
            <LiquiditySurface3D
              currentTicker={currentTicker}
              orderBook={orderBook}
              tickers={tickers}
              onSelectSymbol={handleSelectSymbol}
            />
          )}

          {activeTab === 'fundamentals' && (
            <FundamentalsWorkspace
              currentTicker={currentTicker}
            />
          )}

          {activeTab === 'news' && (
            <NewsMacroWorkspace
              news={news}
              onRefresh={loadNews}
              loading={newsLoading}
            />
          )}

          {activeTab === 'ai' && (
            <AiIntelligenceLab
              currentTicker={currentTicker}
              aiAnalysis={aiAnalysis}
              onUpdateAnalysis={setAiAnalysis}
            />
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          loadTickers();
        }}
      />

      {/* User Preferences & Watchlists Drawer */}
      <UserDrawer
        isOpen={userDrawerOpen}
        onClose={() => setUserDrawerOpen(false)}
        user={user}
        currentTicker={currentTicker}
        onSelectSymbol={handleSelectSymbol}
      />
    </div>
  );
}
