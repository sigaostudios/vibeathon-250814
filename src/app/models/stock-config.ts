export interface StockConfig {
  apiKey?: string;
  demoMode?: boolean;
  updateInterval?: number; // in milliseconds
  watchlist?: string[]; // list of tickers to watch
}