import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, memo, useRef } from 'react';
import { MOCK_TICKERS } from './constants';
import { StockTicker, AppMode, TimeRange, StockData, User, LimitType } from './types';
import StockChart from './components/StockChart';
import UserMenu from './components/UserMenu';
import RizbotLogo from './components/RizbotLogo';

// Toast notification type
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Lazy load komponen yang tidak langsung diperlukan
const Predictor = lazy(() => import('./components/Predictor'));
const LiveAssistant = lazy(() => import('./components/LiveAssistant'));
const MapsLocator = lazy(() => import('./components/MapsLocator'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const UpgradeModal = lazy(() => import('./components/UpgradeModal'));
const PriceAlertModal = lazy(() => import('./components/PriceAlertModal'));
const PortfolioTracker = lazy(() => import('./components/PortfolioTracker'));
const AddTransactionModal = lazy(() => import('./components/AddTransactionModal'));
const WatchlistSearch = lazy(() => import('./components/WatchlistSearch'));
const UsageLimitModal = lazy(() => import('./components/UsageLimitModal'));
const QuickAnalysis = lazy(() => import('./components/QuickAnalysis'));
const TradingRecommendation = lazy(() => import('./components/TradingRecommendation'));
const NewsSentimentPanel = lazy(() => import('./components/NewsSentimentPanel'));
const TechnicalScanner = lazy(() => import('./components/TechnicalScanner'));
const MarketOverview = lazy(() => import('./components/MarketOverview'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

// Settings imports
import { loadSettings, AppSettings } from './components/SettingsPanel';

// Loading Spinner Component
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
  </div>
));
import { getQuickSentiment } from './services/geminiService';
import { fetchHistoricalData } from './services/marketData';
import { getCurrentUser, logout, getCurrentUsage } from './services/authService';
import { getActiveAlerts, checkAlerts } from './services/alertService';
import { getWatchlist, addToWatchlist, removeFromWatchlist, fetchWatchlistData, CRYPTO_PROFILES } from './services/realTimeData';

const App: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<StockTicker>(MOCK_TICKERS[0]);
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [sentiment, setSentiment] = useState<string>('NEUTRAL');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Market Data State
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartData, setChartData] = useState<StockData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);

  // User & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Feature Modals
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showWatchlistSearch, setShowWatchlistSearch] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<LimitType>('dailyAnalysis');
  const [limitModalUsage, setLimitModalUsage] = useState(0);
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // App Settings
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);
  
  // Watchlist State
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistData, setWatchlistData] = useState<StockTicker[]>([]);
  
  // Current prices for portfolio
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  
  // Alert counts
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Update time - optimized to update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Ctrl/Cmd + K = Quick search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowWatchlistSearch(true);
      }
      // Escape = Close modals
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowAlertModal(false);
        setShowPortfolioModal(false);
        setShowNewsPanel(false);
        setShowWatchlistSearch(false);
      }
      // Number keys 1-4 for quick navigation
      if (e.key === '1') setMode(AppMode.DASHBOARD);
      if (e.key === '2') setMode(AppMode.MARKET_OVERVIEW);
      if (e.key === '3') setMode(AppMode.LIVE_ASSISTANT);
      if (e.key === '4') setMode(AppMode.MAPS_LOCATOR);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load user on mount - run once
  useEffect(() => {
    // Load icons async
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Load watchlist
    const savedWatchlist = getWatchlist();
    setWatchlist(savedWatchlist);
    
    // Load alerts count
    setActiveAlertsCount(getActiveAlerts().length);
  }, []);

  // Load watchlist data with debounce
  useEffect(() => {
    let isMounted = true;
    const loadWatchlistData = async () => {
      if (watchlist.length === 0) {
        setWatchlistData(MOCK_TICKERS);
        return;
      }
      
      setIsLoadingWatchlist(true);
      try {
        const data = await fetchWatchlistData(watchlist);
        if (!isMounted) return;
        
        setWatchlistData(data);
        
        // Update current prices
        const prices: Record<string, number> = {};
        data.forEach(t => {
          prices[t.symbol] = t.price;
        });
        setCurrentPrices(prices);
        
        // Check price alerts
        data.forEach(t => {
          checkAlerts(t.symbol, t.price);
        });
      } catch (e) {
        console.error("Failed to load watchlist data", e);
        if (isMounted) setWatchlistData(MOCK_TICKERS);
      } finally {
        if (isMounted) setIsLoadingWatchlist(false);
      }
    };

    loadWatchlistData();
    
    // Refresh every 60 seconds (optimized from 30s)
    const interval = setInterval(loadWatchlistData, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [watchlist]);

  // Fetch data when ticker or range changes - with abort controller
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const data = await fetchHistoricalData(selectedTicker.symbol, timeRange);
        if (!isMounted) return;
        setChartData(data);
      } catch (e) {
        console.error("Failed to load chart data", e);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    loadData();
    
    // Debounced sentiment fetch - run after chart loads
    const sentimentTimer = setTimeout(() => {
      if (isMounted) {
        getQuickSentiment(`Latest on-chain metrics and news for ${selectedTicker.name} crypto project.`).then(s => {
          if (isMounted) setSentiment(s);
        });
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(sentimentTimer);
    };
  }, [selectedTicker, timeRange]);

  // Live Feed Simulation for 1D/5D ranges - optimized with requestAnimationFrame
  useEffect(() => {
    if (timeRange !== '1D' && timeRange !== '5D') return;

    const interval = setInterval(() => {
        setChartData(prev => {
            if (prev.length === 0) return prev;
            // Clone the array to avoid mutation issues
            const newData = [...prev];
            const lastCandle = newData[newData.length - 1];
            
            // Simple random walk for the last candle close
            const volatility = 0.001; // Higher vol for crypto
            const change = lastCandle.close * (Math.random() - 0.5) * volatility;
            
            // Update last candle
            const newClose = lastCandle.close + change;
            newData[newData.length - 1] = {
                ...lastCandle,
                close: newClose,
                high: Math.max(lastCandle.high, newClose),
                low: Math.min(lastCandle.low, newClose),
                volume: lastCandle.volume + Math.floor(Math.random() * 5000)
            };
            
            // Update selected ticker price in UI
            setSelectedTicker(t => ({
                ...t,
                price: parseFloat(newClose.toFixed(2)),
                change: newClose - prev[0].open, 
                changePercent: parseFloat((((newClose - prev[0].open) / prev[0].open) * 100).toFixed(2))
            }));

            return newData;
        });
    }, 3000); // Update every 3 seconds for better performance

    return () => clearInterval(interval);
  }, [timeRange]);

  // Memoized price display
  const priceDisplay = useMemo(() => ({
    formatted: selectedTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    changeFormatted: (selectedTicker.change >= 0 ? '+' : '') + selectedTicker.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    percentFormatted: (selectedTicker.changePercent >= 0 ? '+' : '') + selectedTicker.changePercent.toFixed(2) + '%',
    isPositive: selectedTicker.change >= 0
  }), [selectedTicker]);

  // Handler functions
  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
  }, []);

  const handleAddToWatchlist = useCallback((symbol: string) => {
    addToWatchlist(symbol);
    setWatchlist(prev => [...prev, symbol]);
    showToast(`${symbol} added to watchlist`, 'success');
  }, [showToast]);

  const handleRemoveFromWatchlist = useCallback((symbol: string) => {
    removeFromWatchlist(symbol);
    setWatchlist(prev => prev.filter(s => s !== symbol));
    showToast(`${symbol} removed from watchlist`, 'info');
  }, [showToast]);

  // Apply settings effect
  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', appSettings.theme);
    
    // Apply reduced motion
    if (appSettings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Apply animations
    if (!appSettings.enableAnimations) {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
  }, [appSettings]);

  const handleLimitReached = useCallback((type: LimitType) => {
    setLimitModalType(type);
    setLimitModalUsage(getCurrentUsage(type === 'dailyAnalysis' ? 'analysis' : 'alerts'));
    setShowLimitModal(true);
  }, []);

  const handleTickerSelect = useCallback((ticker: StockTicker) => {
    setSelectedTicker(ticker);
    setMode(AppMode.DASHBOARD);
  }, []);

  // Market is 24/7 for crypto
  const isMarketOpen = true;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-200 flex font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-72 bg-[#0f1629] border-r border-slate-800/60 flex flex-col flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-4 lg:p-5 flex flex-col lg:flex-row items-center gap-3 border-b border-slate-800/60">
          <RizbotLogo size={80} variant="oil" animated={false} />
          <div className="hidden lg:block">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white tracking-tight"></span>
              <span className="text-xl font-bold text-emerald-400 ml-1">Crypto</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
              <span className="text-[10px] text-slate-500">{isMarketOpen ? '24/7 Live Trading' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1.5">
          <div className="text-[10px] text-slate-600 uppercase font-bold mb-3 px-3 hidden lg:block tracking-wider">Menu</div>
          <SidebarItem 
            icon="dashboard" 
            label="Dashboard" 
            active={mode === AppMode.DASHBOARD} 
            onClick={() => setMode(AppMode.DASHBOARD)} 
          />
          <SidebarItem 
            icon="trending_up" 
            label="Market Overview" 
            active={mode === AppMode.MARKET_OVERVIEW} 
            onClick={() => setMode(AppMode.MARKET_OVERVIEW)} 
          />
          <SidebarItem 
            icon="mic" 
            label="Live Assistant" 
            active={mode === AppMode.LIVE_ASSISTANT} 
            onClick={() => setMode(AppMode.LIVE_ASSISTANT)}
            badge="PRO"
          />
          <SidebarItem 
            icon="location_on" 
            label="HQ Locator" 
            active={mode === AppMode.MAPS_LOCATOR} 
            onClick={() => setMode(AppMode.MAPS_LOCATOR)} 
          />
          <SidebarItem 
            icon="settings" 
            label="Settings" 
            active={false} 
            onClick={() => setShowSettings(true)} 
          />
        </nav>

        {/* Watchlist */}
        <div className="p-2 border-t border-slate-800/60 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[9px] text-slate-500 uppercase font-bold hidden lg:block tracking-wider">Watchlist</span>
            <div className="flex items-center gap-1.5">
              {isLoadingWatchlist && (
                <span className="material-icons-round text-[10px] text-emerald-400 animate-spin">sync</span>
              )}
              <span className="text-[9px] text-slate-600 hidden lg:block">{watchlistData.length}</span>
              <button
                onClick={() => setShowWatchlistSearch(true)}
                className="w-5 h-5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all"
                title="Add Crypto"
              >
                <span className="material-icons-round text-xs">add</span>
              </button>
            </div>
          </div>
          <div className="space-y-0.5 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
            {(watchlistData.length > 0 ? watchlistData : MOCK_TICKERS).map(t => {
              const profile = CRYPTO_PROFILES[t.symbol];
              return (
                <div
                  key={t.symbol}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-all duration-150 group relative ${
                    selectedTicker.symbol === t.symbol
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => handleTickerSelect(t)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      profile?.color || (selectedTicker.symbol === t.symbol
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700')
                    }`}>
                      {profile?.icon || t.symbol.charAt(0)}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className={`font-semibold text-xs ${selectedTicker.symbol === t.symbol ? 'text-emerald-400' : 'text-slate-200'}`}>{t.symbol}</span>
                      <span className="text-[9px] text-slate-500 hidden lg:block truncate max-w-[70px]">
                        {profile?.name || t.name}
                      </span>
                    </div>
                  </button>
                  <div className="hidden lg:flex items-center gap-1.5">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-mono text-slate-300">${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className={`text-[9px] font-mono font-medium ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.change >= 0 ? '+' : ''}{t.changePercent.toFixed(1)}%
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWatchlist(t.symbol);
                      }}
                      className="w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-all"
                      title="Remove from Watchlist"
                    >
                      <span className="material-icons-round text-xs">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-800/60 hidden lg:block flex-shrink-0">
          <div className="text-[9px] text-slate-600 text-center">
            Powered by <span className="text-emerald-400">RIZBOT AI</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0e17]">
        {/* Header */}
        <header className="h-16 bg-[#0a0e17]/90 backdrop-blur-xl border-b border-slate-800/40 sticky top-0 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {mode === AppMode.DASHBOARD ? (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{selectedTicker.symbol}</h1>
                  <span className="text-slate-500 font-normal hidden sm:inline text-sm">{selectedTicker.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-mono font-bold ${priceDisplay.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${priceDisplay.formatted}
                  </span>
                  <span className={`text-xs font-mono px-2 py-1 rounded-lg ${
                    priceDisplay.isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {priceDisplay.percentFormatted}
                  </span>
                </div>
              </>
            ) : (
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-icons-round text-emerald-400">
                  {mode === AppMode.LIVE_ASSISTANT ? 'mic' : mode === AppMode.MARKET_OVERVIEW ? 'trending_up' : 'location_on'}
                </span>
                {mode === AppMode.LIVE_ASSISTANT ? 'Live Assistant' : mode === AppMode.MARKET_OVERVIEW ? 'Market Overview' : 'HQ Locator'}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick Search Button */}
            <button
              onClick={() => setShowWatchlistSearch(true)}
              className="hidden md:flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600"
              title="Quick Search (Ctrl+K)"
            >
              <span className="material-icons-round text-sm">search</span>
              <span className="text-xs">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono text-slate-400">
                <span>⌘</span><span>K</span>
              </kbd>
            </button>

            {/* News Sentiment Button */}
            <button
              onClick={() => setShowNewsPanel(true)}
              className="relative bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 p-2.5 rounded-xl transition-all border border-slate-700/50 hover:border-cyan-500/30"
              title="News Sentiment"
            >
              <span className="material-icons-round text-lg">article</span>
            </button>

            {/* Portfolio Button */}
            <button
              onClick={() => setShowPortfolioModal(true)}
              className="relative bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-purple-400 p-2.5 rounded-xl transition-all border border-slate-700/50 hover:border-purple-500/30"
              title="Portfolio Tracker"
            >
              <span className="material-icons-round text-lg">account_balance_wallet</span>
            </button>

            {/* Price Alert Button */}
            <button
              onClick={() => setShowAlertModal(true)}
              className="relative bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-amber-400 p-2.5 rounded-xl transition-all border border-slate-700/50 hover:border-amber-500/30"
              title="Price Alerts"
            >
              <span className="material-icons-round text-lg">notifications</span>
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 p-2.5 rounded-xl transition-all border border-slate-700/50 hover:border-cyan-500/30"
              title="Settings"
            >
              <span className="material-icons-round text-lg">settings</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-700/50">
              <span className="material-icons-round text-sm">schedule</span>
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </div>

            {user ? (
              <UserMenu 
                user={user} 
                onLogout={handleLogout} 
                onUpgrade={() => setShowUpgradeModal(true)} 
              />
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.98] flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">login</span>
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-6 max-w-[1800px] mx-auto space-y-6">
          
          {mode === AppMode.DASHBOARD && (
            <div className="space-y-5">
              {/* Top Section: Chart + Stats Row */}
              <div className="space-y-4">
                {/* Chart */}
                <StockChart 
                  data={chartData} 
                  symbol={selectedTicker.symbol} 
                  timeRange={timeRange}
                  onRangeChange={setTimeRange}
                  loading={isLoadingData}
                />
                
                {/* Stats Row - Horizontal */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Price"
                    value={`$${priceDisplay.formatted}`}
                    icon="attach_money"
                  />
                  <StatCard
                    label="24h High"
                    value={`$${(selectedTicker.price * 1.02).toLocaleString('en-US', {maximumFractionDigits: 2})}`}
                    icon="arrow_upward"
                    trend="up"
                  />
                  <StatCard
                    label="24h Low"
                    value={`$${(selectedTicker.price * 0.98).toLocaleString('en-US', {maximumFractionDigits: 2})}`}
                    icon="arrow_downward"
                    trend="down"
                  />
                  <StatCard
                    label="Volume"
                    value="$12.5M"
                    icon="bar_chart"
                  />
                </div>
              </div>

              {/* AI Analysis Section - Full Width */}
              <Suspense fallback={<LoadingSpinner />}>
                <Predictor ticker={selectedTicker} />
              </Suspense>

              {/* Bottom Grid: 2 Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Trading Recommendation */}
                <div className="h-full">
                  <Suspense fallback={<LoadingSpinner />}>
                    <TradingRecommendation ticker={selectedTicker} />
                  </Suspense>
                </div>

                {/* Order Book */}
                <div className="h-full bg-gradient-to-br from-[#141c2f] to-[#0f1629] rounded-2xl p-4 border border-slate-800/60 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="material-icons-round text-emerald-400 text-base">menu_book</span>
                      Order Book
                    </h3>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                      Live
                    </span>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold mb-2 px-2">
                    <span>Price</span>
                    <span>Amount</span>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    <OrderBookRow price={(selectedTicker.price * 1.015).toFixed(2)} volume="0.25" symbol={selectedTicker.symbol} type="ask" depth={30} />
                    <OrderBookRow price={(selectedTicker.price * 1.01).toFixed(2)} volume="0.45" symbol={selectedTicker.symbol} type="ask" depth={50} />
                    <OrderBookRow price={(selectedTicker.price * 1.005).toFixed(2)} volume="1.20" symbol={selectedTicker.symbol} type="ask" depth={80} />

                    <div className="flex justify-between items-center text-emerald-400 border-y border-slate-700/50 py-2 my-1.5 font-bold text-sm px-2 bg-gradient-to-r from-emerald-500/15 to-transparent rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></span>
                        ${selectedTicker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-emerald-300">2.30 {selectedTicker.symbol}</span>
                    </div>

                    <OrderBookRow price={(selectedTicker.price * 0.995).toFixed(2)} volume="5.00" symbol={selectedTicker.symbol} type="bid" depth={100} />
                    <OrderBookRow price={(selectedTicker.price * 0.99).toFixed(2)} volume="3.20" symbol={selectedTicker.symbol} type="bid" depth={70} />
                    <OrderBookRow price={(selectedTicker.price * 0.985).toFixed(2)} volume="1.80" symbol={selectedTicker.symbol} type="bid" depth={40} />
                  </div>
                </div>
              </div>

              {/* Technical Scanner - Full Width */}
              <Suspense fallback={<LoadingSpinner />}>
                <TechnicalScanner ticker={selectedTicker} chartData={chartData} />
              </Suspense>
            </div>
          )}

          {mode === AppMode.MARKET_OVERVIEW && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Crypto Market Overview</h2>
                  <p className="text-slate-400 text-sm mt-1">Real-time data from CoinGecko API</p>
                </div>
              </div>
              <Suspense fallback={<LoadingSpinner />}>
                <MarketOverview 
                  onSelectCrypto={(symbol) => {
                    const profile = CRYPTO_PROFILES[symbol];
                    if (profile) {
                      handleAddToWatchlist(symbol);
                      handleTickerSelect({
                        symbol,
                        name: profile.name,
                        price: profile.basePrice,
                        change: 0,
                        changePercent: 0,
                        sector: profile.sector,
                      });
                    }
                  }}
                />
              </Suspense>
            </div>
          )}

          {mode === AppMode.LIVE_ASSISTANT && (
             <div className="h-[calc(100vh-140px)] animate-fadeIn">
               <Suspense fallback={<LoadingSpinner />}>
                 <LiveAssistant />
               </Suspense>
             </div>
          )}

          {mode === AppMode.MAPS_LOCATOR && (
            <div className="h-[400px] animate-fadeIn">
              <Suspense fallback={<LoadingSpinner />}>
                <MapsLocator />
              </Suspense>
            </div>
          )}

        </div>
      </main>

      {/* Modals - Lazy loaded */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleLogin}
        />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={(updatedUser) => {
          setUser(updatedUser);
          setShowUpgradeModal(false);
        }}
      />

      <PriceAlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        ticker={selectedTicker}
        onAlertCreated={() => {}}
      />

      <PortfolioTracker
        isOpen={showPortfolioModal}
        onClose={() => setShowPortfolioModal(false)}
        user={user!}
        onAddTransaction={() => {
          setShowPortfolioModal(false);
          setShowAddTransactionModal(true);
        }}
        currentPrices={currentPrices}
      />

      <AddTransactionModal
        isOpen={showAddTransactionModal}
        onClose={() => setShowAddTransactionModal(false)}
        onTransactionAdded={() => {
          setShowAddTransactionModal(false);
          setShowPortfolioModal(true);
        }}
        currentPrices={currentPrices}
      />

      <WatchlistSearch
        isOpen={showWatchlistSearch}
        onClose={() => setShowWatchlistSearch(false)}
        onAddToWatchlist={handleAddToWatchlist}
        currentWatchlist={watchlist}
      />

      <UsageLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType={limitModalType}
        currentUsage={limitModalUsage}
        userTier={user?.subscription || 'free'}
        onUpgrade={() => {
          setShowLimitModal(false);
          setShowUpgradeModal(true);
        }}
      />

      <NewsSentimentPanel 
        isOpen={showNewsPanel}
        onClose={() => setShowNewsPanel(false)}
        symbol={selectedTicker.symbol}
        user={user}
        onLimitReached={() => handleLimitReached('dailyAnalysis')}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={(newSettings) => {
          setAppSettings(newSettings);
          showToast('Settings saved successfully!', 'success');
        }}
      />
      </Suspense>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm animate-slideIn flex items-center gap-3 min-w-[280px] ${
              toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
              toast.type === 'error' ? 'bg-red-500/90 text-white' :
              toast.type === 'warning' ? 'bg-amber-500/90 text-white' :
              'bg-slate-700/90 text-white'
            }`}
          >
            <span className="material-icons-round text-lg">
              {toast.type === 'success' ? 'check_circle' :
               toast.type === 'error' ? 'error' :
               toast.type === 'warning' ? 'warning' : 'info'}
            </span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Memoized Sidebar Item for better performance
const SidebarItem = memo<{ icon: string; label: string; active: boolean; onClick: () => void; badge?: number | string }>(({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 group relative ${
      active
        ? 'bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-lg shadow-emerald-600/30'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <span className={`material-icons-round text-xl transition-transform ${active ? '' : 'group-hover:scale-110'}`}>{icon}</span>
    <span className="hidden lg:block font-medium text-sm">{label}</span>
    {badge && (
      <span className={`hidden lg:block ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
        active ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
      }`}>
        {badge}
      </span>
    )}
  </button>
));

// Memoized StatCard for better performance
const StatCard = memo<{ label: string; value: string; icon?: string; trend?: 'up' | 'down' | 'neutral'; isPositive?: boolean }>(({ label, value, icon, trend, isPositive }) => (
  <div className="bg-gradient-to-br from-[#141c2f] to-[#0f1629] p-4 rounded-xl border border-slate-800/60 shadow-lg hover:border-slate-700/60 transition-colors duration-150 group">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      {icon && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          trend === 'up' ? 'bg-emerald-500/15' : trend === 'down' ? 'bg-red-500/15' : 'bg-slate-700/50'
        }`}>
          <span className={`material-icons-round text-sm ${
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
          }`}>{icon}</span>
        </div>
      )}
    </div>
    <div className={`text-xl font-mono font-bold ${
      trend === 'up' || isPositive === true ? 'text-emerald-400' : trend === 'down' || isPositive === false ? 'text-red-400' : 'text-slate-200'
    }`}>
      {value}
    </div>
  </div>
));

// Memoized Order Book Row Component
const OrderBookRow = memo<{ price: string; volume: string; symbol: string; type: 'bid' | 'ask'; depth: number }>(({ price, volume, symbol, type, depth }) => (
  <div className="relative flex justify-between items-center px-3 py-1.5 rounded-lg overflow-hidden">
    <div
      className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
        type === 'bid' ? 'bg-emerald-500/10' : 'bg-red-500/10'
      }`}
      style={{ width: `${depth}%` }}
    />
    <span className={`relative z-10 ${type === 'bid' ? 'text-emerald-400' : 'text-red-400'}`}>
      ${parseFloat(price).toLocaleString()}
    </span>
    <span className="relative z-10 text-slate-400">{volume} {symbol}</span>
  </div>
));

export default App;