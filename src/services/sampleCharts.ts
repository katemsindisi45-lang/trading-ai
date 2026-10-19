/**
 * Generates clean, institutional sample cryptocurrency chart images
 * for one-click testing of the CryExc Signal Plus Photo Scanner.
 */

export interface SampleChartPreset {
  id: string;
  name: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD_WATCH';
  description: string;
  dataUrl: string;
}

function createSampleChartDataUrl(
  title: string,
  symbol: string,
  isBullish: boolean,
  isHoldWatch = false
): string {
  // Generate an SVG chart representation with candles, volume profile, and delta indicator
  const width = 800;
  const height = 450;
  const bg = '#070B14';
  const gridColor = 'rgba(255,255,255,0.06)';
  const bullColor = '#35D49A';
  const bearColor = '#FF647C';
  const neutralColor = '#FFC66D';
  const accentColor = isHoldWatch ? neutralColor : isBullish ? bullColor : bearColor;

  // Generate 24 simulated candlestick bars
  let currentY = isHoldWatch ? 220 : isBullish ? 280 : 160;
  const candles: string[] = [];
  const startX = 60;
  const barSpacing = 28;

  for (let i = 0; i < 24; i++) {
    const x = startX + i * barSpacing;
    let delta = (Math.random() - 0.48) * 24;
    if (isBullish && i > 16) delta = Math.abs(delta) + 12; // ramp up at end
    if (!isBullish && !isHoldWatch && i > 16) delta = -Math.abs(delta) - 12; // ramp down at end
    if (isHoldWatch && i > 16) delta = (Math.random() - 0.5) * 6; // compress

    const openY = currentY;
    const closeY = Math.max(70, Math.min(360, openY - delta));
    currentY = closeY;

    const highY = Math.min(openY, closeY) - Math.random() * 15;
    const lowY = Math.max(openY, closeY) + Math.random() * 15;
    const isUp = closeY <= openY;
    const color = isUp ? bullColor : bearColor;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(3, Math.abs(closeY - openY));

    // Wick
    candles.push(`<line x1="${x + 6}" y1="${highY}" x2="${x + 6}" y2="${lowY}" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`);
    // Body
    candles.push(`<rect x="${x}" y="${bodyTop}" width="12" height="${bodyHeight}" fill="${color}" rx="1"/>`);
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: ${bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <defs>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#55E6FF" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#A78BFA" stop-opacity="0.05"/>
      </linearGradient>
      <linearGradient id="zoneGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>

    <!-- Background Layer -->
    <rect width="${width}" height="${height}" fill="${bg}"/>
    <rect width="${width}" height="${height}" fill="url(#glow)"/>

    <!-- Grid lines -->
    <line x1="40" y1="90" x2="740" y2="90" stroke="${gridColor}" stroke-dasharray="3,3"/>
    <line x1="40" y1="170" x2="740" y2="170" stroke="${gridColor}" stroke-dasharray="3,3"/>
    <line x1="40" y1="250" x2="740" y2="250" stroke="${gridColor}" stroke-dasharray="3,3"/>
    <line x1="40" y1="330" x2="740" y2="330" stroke="${gridColor}" stroke-dasharray="3,3"/>
    
    <line x1="160" y1="60" x2="160" y2="380" stroke="${gridColor}" stroke-dasharray="3,3"/>
    <line x1="360" y1="60" x2="360" y2="380" stroke="${gridColor}" stroke-dasharray="3,3"/>
    <line x1="560" y1="60" x2="560" y2="380" stroke="${gridColor}" stroke-dasharray="3,3"/>

    <!-- Support / Resistance Zone Box -->
    <rect x="40" y="${isBullish ? 280 : 130}" width="700" height="40" fill="url(#zoneGrad)" stroke="${accentColor}" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="50" y="${isBullish ? 305 : 155}" fill="${accentColor}" font-size="11" font-weight="bold" letter-spacing="1">
      ${isBullish ? 'KEY INSTITUTIONAL DEMAND & ABSORPTION SHELF (POC)' : isHoldWatch ? 'RANGE EQUILIBRIUM & COMPRESSION ZONE' : 'HIGH-VOLUME RESISTANCE & SELLER DEFENSE (VAH)'}
    </text>

    <!-- Candlesticks -->
    ${candles.join('\n')}

    <!-- Order Flow Footprint Imbalance Callouts -->
    <circle cx="680" cy="${currentY}" r="7" fill="${accentColor}" fill-opacity="0.8"/>
    <circle cx="680" cy="${currentY}" r="14" fill="${accentColor}" fill-opacity="0.2"/>

    <!-- Header Overlay -->
    <rect x="40" y="20" width="700" height="40" fill="rgba(11,18,32,0.8)" rx="8" stroke="rgba(255,255,255,0.1)"/>
    <text x="55" y="44" fill="#FFFFFF" font-size="14" font-weight="bold" letter-spacing="0.5">${symbol} • 15m ORDER FLOW FOOTPRINT</text>
    <text x="340" y="44" fill="${accentColor}" font-size="12" font-weight="bold">${title}</text>
    <text x="640" y="44" fill="#91A1B8" font-size="11" font-family="monospace">CryExc Terminal</text>

    <!-- Watermark / Footer -->
    <text x="40" y="415" fill="#64748B" font-size="11" font-family="monospace">CVD Delta Imbalance: ${isBullish ? '+2,840 BTC (Aggressive Absorption)' : isHoldWatch ? '0.00 BTC (Neutral Delta Squeeze)' : '-3,120 BTC (Exhaustion Rejection)'}</text>
    <text x="540" y="415" fill="#64748B" font-size="11" font-family="monospace">Dealer Gamma: ${isBullish ? '+$240M Net Call GEX' : isHoldWatch ? '+$12M Neutral GEX' : '-$190M Short Gamma'}</text>
  </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_CHARTS: SampleChartPreset[] = [
  {
    id: 'sample-btc-bull',
    name: 'BTC Bullish Absorption',
    symbol: 'BTCUSDT',
    type: 'BUY',
    description: 'Demand shelf defense with passive order flow absorption and CVD positive divergence.',
    dataUrl: createSampleChartDataUrl('Bullish Demand Absorption & Delta Divergence', 'BTCUSDT', true, false),
  },
  {
    id: 'sample-eth-bear',
    name: 'ETH Resistance Rejection',
    symbol: 'ETHUSDT',
    type: 'SELL',
    description: 'Value Area High rejection with negative delta expansion and dealer short gamma acceleration.',
    dataUrl: createSampleChartDataUrl('Bearish Supply Rejection & Negative Delta', 'ETHUSDT', false, false),
  },
  {
    id: 'sample-sol-hold',
    name: 'SOL Range Squeeze',
    symbol: 'SOLUSDT',
    type: 'HOLD_WATCH',
    description: 'Tight range compression at equilibrium POC. Wait for volatility breakout confirmation.',
    dataUrl: createSampleChartDataUrl('Volatility Compression & Range Equilibrium', 'SOLUSDT', false, true),
  },
];
