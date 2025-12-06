export interface StockData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical Indicators
export interface TechnicalIndicators {
  // SuperTrend
  supertrend: {
    value: number;
    trend: 'BULLISH' | 'BEARISH';
    signal: 'BUY' | 'SELL' | 'HOLD';
  };
  // MACD
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    crossover: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'NONE';
  };
  // EMA
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
    trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  };
  // RSI
  rsi: {
    value: number;
    condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
  };
  // Bollinger Bands
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'ABOVE_UPPER' | 'NEAR_UPPER' | 'MIDDLE' | 'NEAR_LOWER' | 'BELOW_LOWER';
  };
  // ATR (for SuperTrend calculation)
  atr: number;
}

// Day Trading Advanced Indicators
export interface DayTradingIndicators {
  // VWAP (Volume Weighted Average Price) - CRITICAL for day trading
  vwap: {
    value: number;
    upperBand1: number;  // +1 StdDev
    upperBand2: number;  // +2 StdDev
    lowerBand1: number;  // -1 StdDev
    lowerBand2: number;  // -2 StdDev
    position: 'ABOVE_VWAP' | 'BELOW_VWAP' | 'AT_VWAP';
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  
  // Stochastic RSI - More sensitive than regular RSI
  stochRSI: {
    k: number;          // %K line (fast)
    d: number;          // %D line (slow/signal)
    condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
    crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  };
  
  // ADX (Average Directional Index) - Trend strength
  adx: {
    value: number;      // ADX value
    plusDI: number;     // +DI
    minusDI: number;    // -DI
    trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_TREND';
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  
  // Pivot Points - Intraday S/R levels
  pivotPoints: {
    pivot: number;      // Central pivot
    r1: number;         // Resistance 1
    r2: number;         // Resistance 2
    r3: number;         // Resistance 3
    s1: number;         // Support 1
    s2: number;         // Support 2
    s3: number;         // Support 3
    currentZone: 'ABOVE_R3' | 'R2_R3' | 'R1_R2' | 'PIVOT_R1' | 'S1_PIVOT' | 'S1_S2' | 'S2_S3' | 'BELOW_S3';
  };
  
  // Volume Analysis
  volumeAnalysis: {
    currentVolume: number;
    averageVolume: number;  // 20-period average
    volumeRatio: number;    // Current / Average
    trend: 'HIGH_VOLUME' | 'NORMAL' | 'LOW_VOLUME';
    priceVolumeConfirmation: boolean;  // Volume confirms price movement
  };
  
  // OBV (On-Balance Volume)
  obv: {
    value: number;
    trend: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    divergence: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
  };
}

// Combined Trading Signal Score
export interface TradingSignalScore {
  // Overall Score (0-100)
  overallScore: number;
  
  // Signal Strength
  signalStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'CONFLICTING';
  
  // Final Recommendation
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  
  // Individual Scores (each 0-20)
  scores: {
    trend: number;        // SuperTrend + EMA
    momentum: number;     // MACD + StochRSI
    volume: number;       // VWAP + Volume Analysis + OBV
    strength: number;     // ADX
    levels: number;       // Pivot Points + Bollinger Bands
  };
  
  // Bullish vs Bearish count
  bullishSignals: number;
  bearishSignals: number;
  neutralSignals: number;
  
  // Risk Level
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  
  // Entry/Exit Suggestions
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTP1: number;
  suggestedTP2: number;
  riskRewardRatio: number;
}

// Trading Timeframe Type
export type TradingTimeframe = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// Multi-Timeframe Trading Setup
export interface MultiTimeframeTradingSetup {
  timeframe: TradingTimeframe;
  label: string;
  description: string;
  
  // Price Levels
  currentPrice: number;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTP1: number;
  suggestedTP2: number;
  suggestedTP3: number;
  
  // Risk Management
  riskAmount: number;        // Distance from entry to SL in $
  rewardTP1: number;         // Distance from entry to TP1 in $
  rewardTP2: number;         // Distance from entry to TP2 in $
  rewardTP3: number;         // Distance from entry to TP3 in $
  riskRewardTP1: number;     // R:R for TP1
  riskRewardTP2: number;     // R:R for TP2
  riskRewardTP3: number;     // R:R for TP3
  riskPercent: number;       // Risk as % of entry price
  
  // ATR-based calculations
  atr: number;
  atrMultiplierSL: number;   // How many ATR for SL
  atrMultiplierTP1: number;  // How many ATR for TP1
  atrMultiplierTP2: number;  // How many ATR for TP2
  atrMultiplierTP3: number;  // How many ATR for TP3
  
  // Signal Analysis
  overallScore: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  signalStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'CONFLICTING';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  
  // Key Levels
  keySupport: number[];
  keyResistance: number[];
  
  // Position Sizing (based on 1% risk of $10,000 portfolio)
  positionSizeUSD: number;
  positionSizeUnits: number;
  maxLossUSD: number;
}

// Complete Trading Analysis for all timeframes
export interface CompleteTradingAnalysis {
  symbol: string;
  lastUpdated: Date;
  currentPrice: number;
  
  // Analysis for each timeframe
  daily: MultiTimeframeTradingSetup;
  weekly: MultiTimeframeTradingSetup;
  monthly: MultiTimeframeTradingSetup;
  yearly: MultiTimeframeTradingSetup;
  
  // Best timeframe recommendation
  bestTimeframe: TradingTimeframe;
  bestTimeframeReason: string;
}

export interface StockTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  isLoading?: boolean;
}

export type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y';

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  MARKET_OVERVIEW = 'MARKET_OVERVIEW',
  ANALYSIS = 'ANALYSIS',
  LIVE_ASSISTANT = 'LIVE_ASSISTANT',
  MAPS_LOCATOR = 'MAPS_LOCATOR'
}

export interface PredictionResult {
  forecast: string;
  confidence: number;
  targetPrice: number;
  reasoning: string;
}

// User & Auth Types
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionTier;
  subscriptionExpiry?: Date;
  isAdmin?: boolean;
  createdAt: Date;
}

// Price Alert Types
export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

// Portfolio Types
export interface PortfolioTransaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: Date;
  notes?: string;
}

export interface PortfolioHolding {
  symbol: string;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

// Usage Limit Types
export type LimitType = 'dailyAnalysis' | 'alerts' | 'watchlist' | 'portfolioItems';

export interface UsageLimitInfo {
  current: number;
  max: number;
  featureName?: string;
}

// Tier Limits Configuration
export const TIER_LIMITS: Record<SubscriptionTier, Record<LimitType, number>> = {
  free: {
    dailyAnalysis: 3,
    alerts: 2,
    watchlist: 6,
    portfolioItems: 5,
  },
  basic: {
    dailyAnalysis: 15,
    alerts: 10,
    watchlist: 20,
    portfolioItems: 25,
  },
  pro: {
    dailyAnalysis: 50,
    alerts: 50,
    watchlist: 50,
    portfolioItems: 100,
  },
  enterprise: {
    dailyAnalysis: Infinity,
    alerts: Infinity,
    watchlist: Infinity,
    portfolioItems: Infinity,
  },
};

// RIZBOT AI Types extensions for window
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    webkitAudioContext: typeof AudioContext;
    aistudio?: AIStudio;
  }
}