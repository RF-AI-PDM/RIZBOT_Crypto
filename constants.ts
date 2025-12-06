import { StockTicker, StockData } from './types';

export const MOCK_TICKERS: StockTicker[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 64200, change: 1250, changePercent: 1.98, sector: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', price: 3450, change: -45, changePercent: -1.28, sector: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana', price: 148, change: 12, changePercent: 8.50, sector: 'Crypto' },
  { symbol: 'BNB-USD', name: 'Binance Coin', price: 590, change: 5, changePercent: 0.85, sector: 'Crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', price: 0.12, change: -0.01, changePercent: -7.17, sector: 'Meme' },
  { symbol: 'XRP-USD', name: 'Ripple', price: 0.62, change: 0.02, changePercent: 3.34, sector: 'Crypto' },
];

export const generateMockData = (days: number): StockData[] => {
  const data: StockData[] = [];
  let price = 60000;
  const now = new Date();
  
  for (let i = days; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const volatility = price * 0.05; // Crypto is more volatile
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 100000000);

    data.push({
      time: date.toLocaleDateString('id-ID'),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    price = close;
  }
  return data;
};

export const INITIAL_BTC_DATA = generateMockData(100);