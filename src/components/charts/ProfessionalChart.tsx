import React, { useState, useEffect, useRef } from 'react';
import { 
  CandlestickChart, 
  Clock, 
  Layers, 
  TrendingUp, 
  Maximize2, 
  RefreshCw, 
  Sliders, 
  Activity,
  Crosshair
} from 'lucide-react';
import { KlineBar, MarketTicker } from '../../types/crypto';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { fetchKlines, formatCurrency, formatCompactNumber } from '../../services/marketApi';

interface ProfessionalChartProps {
  currentTicker: MarketTicker | null;
  onRefresh: () => void;
}

export const ProfessionalChart: React.FC<ProfessionalChartProps> = ({
  currentTicker,
  onRefresh,
}) => {
  const [interval, setInterval] = useState<string>('15m');
  const [klines, setKlines] = useState<KlineBar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [hoveredBar, setHoveredBar] = useState<KlineBar | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cvdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadKlines = async () => {
    if (!currentTicker) return;
    setLoading(true);
    try {
      const data = await fetchKlines(currentTicker.symbol, interval, 80);
      setKlines(data);
    } catch (err) {
      console.error('Failed to load klines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKlines();
  }, [currentTicker?.symbol, interval]);

  // Render High-DPI Candlestick Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || klines.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 360;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Calculate price bounds
    const prices = klines.flatMap((k) => [k.high, k.low]);
    const minPrice = Math.min(...prices) * 0.998;
    const maxPrice = Math.max(...prices) * 1.002;
    const priceRange = maxPrice - minPrice || 1;

    // Draw Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = (height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();

      const priceAtY = maxPrice - (i / 6) * priceRange;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(formatCurrency(priceAtY), width - 55, y + 3);
    }

    const candleWidth = Math.max(3, (width - 70) / klines.length - 2);

    // Compute VWAP line
    let cumVolume = 0;
    let cumVwap = 0;
    const vwapPoints: { x: number; y: number }[] = [];

    // Render Candles
    klines.forEach((k, idx) => {
      const x = idx * (candleWidth + 2) + 10;
      const openY = height - ((k.open - minPrice) / priceRange) * height;
      const closeY = height - ((k.close - minPrice) / priceRange) * height;
      const highY = height - ((k.high - minPrice) / priceRange) * height;
      const lowY = height - ((k.low - minPrice) / priceRange) * height;

      const isGreen = k.close >= k.open;
      const color = isGreen ? '#35D49A' : '#FF647C';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Volume bar at bottom
      const maxVol = Math.max(...klines.map((v) => v.volume));
      const volHeight = (k.volume / (maxVol || 1)) * 50;
      ctx.fillStyle = isGreen ? 'rgba(53, 212, 154, 0.25)' : 'rgba(255, 100, 124, 0.25)';
      ctx.fillRect(x, height - volHeight, candleWidth, volHeight);

      // Accumulate VWAP
      const typicalPrice = (k.high + k.low + k.close) / 3;
      cumVolume += k.volume;
      cumVwap += typicalPrice * k.volume;
      if (cumVolume > 0) {
        const vwapVal = cumVwap / cumVolume;
        const vwapY = height - ((vwapVal - minPrice) / priceRange) * height;
        vwapPoints.push({ x: x + candleWidth / 2, y: vwapY });
      }
    });

    // Draw VWAP
    if (showVwap && vwapPoints.length > 1) {
      ctx.strokeStyle = '#55E6FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      vwapPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }
  }, [klines, showVwap]);

  // Render CVD Subpanel
  useEffect(() => {
    const canvas = cvdCanvasRef.current;
    if (!canvas || klines.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 90;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Compute CVD points
    let runningCvd = 0;
    const cvdValues = klines.map((k) => {
      runningCvd += k.delta;
      return runningCvd;
    });

    const minCvd = Math.min(...cvdValues, 0);
    const maxCvd = Math.max(...cvdValues, 1);
    const cvdRange = maxCvd - minCvd || 1;

    const candleWidth = Math.max(3, (width - 70) / klines.length - 2);

    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 2;
    ctx.beginPath();

    cvdValues.forEach((val, idx) => {
      const x = idx * (candleWidth + 2) + 10 + candleWidth / 2;
      const y = height - ((val - minCvd) / cvdRange) * (height - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Baseline 0
    const zeroY = height - ((0 - minCvd) / cvdRange) * (height - 20) - 10;
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width - 60, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [klines]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <GlassCard
        title={
          <div className="flex items-center gap-2">
            <CandlestickChart className="w-4 h-4 text-cyan-400" />
            <span>Professional Multi-Timeframe Chart ({currentTicker?.symbol || 'BTCUSDT'})</span>
          </div>
        }
        subtitle="Candlesticks, Volume Profile, Anchored VWAP, and Cumulative Delta Subpanel"
        action={
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Interval buttons */}
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setInterval(tf)}
                  className={`px-2 py-0.5 rounded transition ${
                    interval === tf ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowVwap(!showVwap)}
              className={`px-2 py-1 rounded-lg border transition ${
                showVwap ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              VWAP
            </button>

            <button
              onClick={loadKlines}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        }
        noPadding
      >
        <div className="p-4 space-y-3">
          {/* Main Price Canvas */}
          <div className="relative w-full h-[360px] bg-black/40 rounded-xl border border-white/[0.06] overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" />
            {loading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center font-mono text-xs text-cyan-400">
                Streaming exchange klines...
              </div>
            )}
          </div>

          {/* CVD Subpanel */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                CVD Subpanel (Cumulative Volume Delta)
              </span>
              <span className="text-purple-300">Purple Line = Net Aggressive Flow</span>
            </div>
            <div className="w-full h-[90px] bg-black/40 rounded-xl border border-white/[0.06] overflow-hidden">
              <canvas ref={cvdCanvasRef} className="w-full h-full" />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
