import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { EventBus } from '../game/EventBus';
import { environment } from '../environments/environment';
import {
  AggregatesResponse,
  AggregateBar,
  Timespan,
  SortOrder,
  TickerDetailsResponse,
  TickerDetails,
  SnapshotResponse,
  Snapshot,
  AllTickersSnapshotResponse,
  StockConfig
} from './models';

@Injectable({ providedIn: 'root' })
export class StocksService {
  private readonly BASE_URL = environment.polygonApiUrl;
  private apiKey: string = environment.polygonApiKey || '';
  private demoMode: boolean = !environment.polygonApiKey; // Use demo mode if no API key
  private watchlist: string[] = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  private updateInterval: number = 30000; // 30 seconds default

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    const config = await this.storage.getItem<StockConfig>('stock-config');
    if (config) {
      // Override environment settings with stored config if available
      this.apiKey = config.apiKey || this.apiKey;
      this.demoMode = config.demoMode !== undefined ? config.demoMode : this.demoMode;
      this.updateInterval = config.updateInterval || 30000;
      this.watchlist = config.watchlist || this.watchlist;
    }
    
    // If we have an API key from environment but demo mode wasn't explicitly set, disable demo mode
    if (this.apiKey && config?.demoMode === undefined) {
      this.demoMode = false;
    }
    
    // Emit config loaded event
    EventBus.emit('stocks-config-loaded', {
      demoMode: this.demoMode,
      hasApiKey: !!this.apiKey,
      watchlist: this.watchlist
    });
  }

  async setConfig(config: StockConfig): Promise<void> {
    await this.storage.setItem('stock-config', config);
    this.apiKey = config.apiKey || '';
    this.demoMode = config.demoMode !== false;
    this.updateInterval = config.updateInterval || 30000;
    this.watchlist = config.watchlist || this.watchlist;
    
    // Emit config saved event
    EventBus.emit('stocks-config-saved', config);
  }

  getConfig(): StockConfig {
    return {
      apiKey: this.apiKey,
      demoMode: this.demoMode,
      updateInterval: this.updateInterval,
      watchlist: this.watchlist
    };
  }

  private getApiParams(): HttpParams {
    if (!this.apiKey && !this.demoMode) {
      console.warn('No API key set. Please configure your Polygon.io API key or enable demo mode.');
    }
    return new HttpParams().set('apiKey', this.apiKey);
  }

  private handleError(error: any): Observable<never> {
    console.error('Polygon API Error:', error);
    
    // Emit error event for game to react to
    EventBus.emit('stock-api-error', {
      message: error.message || 'API request failed',
      status: error.status
    });
    
    return throwError(() => error);
  }

  // Get aggregate bars for a stock over a time range
  getAggregates(
    ticker: string,
    multiplier: number,
    timespan: Timespan,
    from: string,
    to: string,
    adjusted: boolean = true,
    sort: SortOrder = 'asc',
    limit: number = 5000
  ): Observable<AggregatesResponse> {
    if (this.demoMode) {
      return this.getDemoAggregates(ticker, timespan);
    }

    const url = `${this.BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`;
    let params = this.getApiParams()
      .set('adjusted', adjusted.toString())
      .set('sort', sort)
      .set('limit', limit.toString());

    return this.http.get<AggregatesResponse>(url, { params }).pipe(
      tap(data => this.emitStockData('aggregates', ticker, data)),
      catchError(this.handleError)
    );
  }

  // Get ticker details
  getTickerDetails(ticker: string): Observable<TickerDetailsResponse> {
    if (this.demoMode) {
      return this.getDemoTickerDetails(ticker);
    }

    const url = `${this.BASE_URL}/v3/reference/tickers/${ticker}`;
    const params = this.getApiParams();

    return this.http.get<TickerDetailsResponse>(url, { params }).pipe(
      tap(data => this.emitStockData('details', ticker, data)),
      catchError(this.handleError)
    );
  }

  // Get snapshot of a ticker
  getSnapshot(ticker: string): Observable<SnapshotResponse> {
    if (this.demoMode) {
      return this.getDemoSnapshot(ticker);
    }

    const url = `${this.BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`;
    const params = this.getApiParams();

    return this.http.get<SnapshotResponse>(url, { params }).pipe(
      tap(data => this.emitStockData('snapshot', ticker, data)),
      catchError(this.handleError)
    );
  }

  // Get all tickers snapshot
  getAllTickersSnapshot(tickers?: string[]): Observable<AllTickersSnapshotResponse> {
    if (this.demoMode) {
      return this.getDemoAllTickersSnapshot(tickers || this.watchlist);
    }

    const url = `${this.BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers`;
    let params = this.getApiParams();
    
    if (tickers && tickers.length > 0) {
      params = params.set('tickers', tickers.join(','));
    }

    return this.http.get<AllTickersSnapshotResponse>(url, { params }).pipe(
      tap(data => this.emitStockData('all-snapshots', 'multiple', data)),
      catchError(this.handleError)
    );
  }

  // Get previous day's OHLC
  getPreviousClose(ticker: string): Observable<AggregatesResponse> {
    if (this.demoMode) {
      return this.getDemoPreviousClose(ticker);
    }

    const url = `${this.BASE_URL}/v2/aggs/ticker/${ticker}/prev`;
    const params = this.getApiParams().set('adjusted', 'true');

    return this.http.get<AggregatesResponse>(url, { params }).pipe(
      tap(data => this.emitStockData('previous-close', ticker, data)),
      catchError(this.handleError)
    );
  }

  // Emit stock data to EventBus for game integration
  private emitStockData(type: string, ticker: string, data: any): void {
    EventBus.emit('stock-data-received', {
      type,
      ticker,
      data,
      timestamp: Date.now()
    });
  }

  // Start watching stocks with periodic updates
  startWatching(tickers?: string[], interval?: number): void {
    const watchTickers = tickers || this.watchlist;
    const updateMs = interval || this.updateInterval;
    
    // Initial fetch
    this.getAllTickersSnapshot(watchTickers).subscribe();
    
    // Set up interval
    const intervalId = setInterval(() => {
      this.getAllTickersSnapshot(watchTickers).subscribe();
    }, updateMs);
    
    // Store interval ID for cleanup
    EventBus.emit('stock-watching-started', {
      tickers: watchTickers,
      interval: updateMs,
      intervalId
    });
  }

  // Demo data generators
  private getDemoAggregates(ticker: string, timespan: Timespan): Observable<AggregatesResponse> {
    const basePrice = this.getRandomBasePrice(ticker);
    const count = timespan === 'minute' ? 60 : timespan === 'hour' ? 24 : 30;
    const results: AggregateBar[] = [];
    
    let currentPrice = basePrice;
    const now = Date.now();
    const timeDelta = this.getTimeDelta(timespan);
    
    for (let i = count - 1; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 4;
      const open = currentPrice;
      const close = currentPrice + variance;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      
      results.push({
        o: parseFloat(open.toFixed(2)),
        h: parseFloat(high.toFixed(2)),
        l: parseFloat(low.toFixed(2)),
        c: parseFloat(close.toFixed(2)),
        v: volume,
        vw: parseFloat(((high + low) / 2).toFixed(2)),
        t: now - (timeDelta * i),
        n: Math.floor(Math.random() * 1000) + 100
      });
      
      currentPrice = close;
    }
    
    const response: AggregatesResponse = {
      ticker: ticker.toUpperCase(),
      status: 'OK',
      adjusted: true,
      queryCount: count,
      resultsCount: count,
      results
    };
    
    return of(response).pipe(
      tap(data => this.emitStockData('aggregates', ticker, data))
    );
  }

  private getDemoTickerDetails(ticker: string): Observable<TickerDetailsResponse> {
    const companies: { [key: string]: Partial<TickerDetails> } = {
      'AAPL': { name: 'Apple Inc.', market_cap: 2800000000000, total_employees: 150000 },
      'GOOGL': { name: 'Alphabet Inc.', market_cap: 1900000000000, total_employees: 180000 },
      'MSFT': { name: 'Microsoft Corporation', market_cap: 2600000000000, total_employees: 220000 },
      'AMZN': { name: 'Amazon.com Inc.', market_cap: 1600000000000, total_employees: 1500000 },
      'TSLA': { name: 'Tesla Inc.', market_cap: 800000000000, total_employees: 100000 }
    };
    
    const companyData = companies[ticker.toUpperCase()] || {
      name: `${ticker.toUpperCase()} Demo Company`,
      market_cap: Math.floor(Math.random() * 100000000000),
      total_employees: Math.floor(Math.random() * 50000)
    };
    
    const response: TickerDetailsResponse = {
      status: 'OK',
      results: {
        ticker: ticker.toUpperCase(),
        name: companyData.name!,
        market: 'stocks',
        locale: 'us',
        primary_exchange: 'XNAS',
        type: 'CS',
        active: true,
        currency_name: 'usd',
        market_cap: companyData.market_cap,
        description: `Demo data for ${companyData.name}. This is simulated data for testing.`,
        homepage_url: `https://example.com/${ticker.toLowerCase()}`,
        total_employees: companyData.total_employees
      }
    };
    
    return of(response).pipe(
      tap(data => this.emitStockData('details', ticker, data))
    );
  }

  private getDemoSnapshot(ticker: string): Observable<SnapshotResponse> {
    const basePrice = this.getRandomBasePrice(ticker);
    const dayChange = (Math.random() - 0.5) * 10;
    const minuteChange = (Math.random() - 0.5) * 0.5;
    
    const response: SnapshotResponse = {
      status: 'OK',
      ticker: {
        ticker: ticker.toUpperCase(),
        day: {
          o: basePrice,
          h: basePrice + Math.random() * 5,
          l: basePrice - Math.random() * 5,
          c: basePrice + dayChange,
          v: Math.floor(Math.random() * 10000000),
          vw: basePrice + dayChange / 2
        },
        min: {
          av: basePrice + dayChange,
          t: Date.now(),
          n: Math.floor(Math.random() * 100),
          o: basePrice + dayChange,
          h: basePrice + dayChange + minuteChange,
          l: basePrice + dayChange - minuteChange,
          c: basePrice + dayChange + minuteChange / 2,
          v: Math.floor(Math.random() * 100000),
          vw: basePrice + dayChange
        },
        prevDay: {
          o: basePrice - 2,
          h: basePrice + 3,
          l: basePrice - 3,
          c: basePrice,
          v: Math.floor(Math.random() * 10000000),
          vw: basePrice
        },
        todaysChange: dayChange,
        todaysChangePerc: (dayChange / basePrice) * 100
      }
    };
    
    return of(response).pipe(
      tap(data => this.emitStockData('snapshot', ticker, data))
    );
  }

  private getDemoAllTickersSnapshot(tickers: string[]): Observable<AllTickersSnapshotResponse> {
    const snapshots: Snapshot[] = tickers.map(ticker => {
      const basePrice = this.getRandomBasePrice(ticker);
      const dayChange = (Math.random() - 0.5) * 10;
      
      return {
        ticker: ticker.toUpperCase(),
        day: {
          o: basePrice,
          h: basePrice + Math.random() * 5,
          l: basePrice - Math.random() * 5,
          c: basePrice + dayChange,
          v: Math.floor(Math.random() * 10000000),
          vw: basePrice + dayChange / 2
        },
        prevDay: {
          o: basePrice - 2,
          h: basePrice + 3,
          l: basePrice - 3,
          c: basePrice,
          v: Math.floor(Math.random() * 10000000),
          vw: basePrice
        },
        todaysChange: dayChange,
        todaysChangePerc: (dayChange / basePrice) * 100,
        updated: Date.now()
      };
    });
    
    const response: AllTickersSnapshotResponse = {
      status: 'OK',
      tickers: snapshots,
      count: snapshots.length
    };
    
    return of(response).pipe(
      tap(data => this.emitStockData('all-snapshots', 'multiple', data))
    );
  }

  private getDemoPreviousClose(ticker: string): Observable<AggregatesResponse> {
    const basePrice = this.getRandomBasePrice(ticker);
    
    const response: AggregatesResponse = {
      ticker: ticker.toUpperCase(),
      status: 'OK',
      adjusted: true,
      queryCount: 1,
      resultsCount: 1,
      results: [{
        o: basePrice - 2,
        h: basePrice + 3,
        l: basePrice - 3,
        c: basePrice,
        v: Math.floor(Math.random() * 10000000),
        vw: basePrice,
        t: Date.now() - 86400000,
        n: Math.floor(Math.random() * 10000)
      }]
    };
    
    return of(response).pipe(
      tap(data => this.emitStockData('previous-close', ticker, data))
    );
  }

  private getRandomBasePrice(ticker: string): number {
    const prices: { [key: string]: number } = {
      'AAPL': 175,
      'GOOGL': 140,
      'MSFT': 380,
      'AMZN': 170,
      'TSLA': 250
    };
    return prices[ticker.toUpperCase()] || Math.random() * 200 + 50;
  }

  private getTimeDelta(timespan: Timespan): number {
    const deltas: { [key: string]: number } = {
      'minute': 60000,
      'hour': 3600000,
      'day': 86400000,
      'week': 604800000,
      'month': 2592000000,
      'quarter': 7776000000,
      'year': 31536000000
    };
    return deltas[timespan];
  }
}