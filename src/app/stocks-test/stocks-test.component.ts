import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StocksService } from '../stocks.service';
import { EventBus } from '../../game/EventBus';
import { 
  AggregatesResponse, 
  TickerDetailsResponse, 
  SnapshotResponse,
  AllTickersSnapshotResponse 
} from '../models';

@Component({
  selector: 'app-stocks-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stocks-test-container">
      <h2>Stocks Service Test</h2>
      
      <div class="config-info">
        <h3>Configuration</h3>
        <p>Demo Mode: {{ config.demoMode ? 'Enabled' : 'Disabled' }}</p>
        <p>API Key: {{ config.apiKey ? 'Set' : 'Not Set' }}</p>
        <p>Update Interval: {{ config.updateInterval }}ms</p>
        <p>Watchlist: {{ config.watchlist?.join(', ') }}</p>
      </div>

      <div class="test-controls">
        <h3>Test Methods</h3>
        <button (click)="testAggregates()">Test Aggregates (AAPL)</button>
        <button (click)="testTickerDetails()">Test Ticker Details (GOOGL)</button>
        <button (click)="testSnapshot()">Test Snapshot (MSFT)</button>
        <button (click)="testAllSnapshots()">Test All Snapshots</button>
        <button (click)="testPreviousClose()">Test Previous Close (TSLA)</button>
        <button (click)="startWatching()">Start Watching</button>
        <button (click)="clearResults()">Clear Results</button>
      </div>

      <div class="results">
        <h3>Results</h3>
        <div *ngFor="let result of testResults" class="result-item">
          <h4>{{ result.title }}</h4>
          <pre>{{ result.data | json }}</pre>
        </div>
      </div>

      <div class="events">
        <h3>EventBus Events</h3>
        <div *ngFor="let event of events" class="event-item">
          <strong>{{ event.type }}</strong> - {{ event.ticker }} 
          <span class="timestamp">({{ event.timestamp | date:'medium' }})</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stocks-test-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      color: #333;
      background: #1a1a1a;
      min-height: 100vh;
    }

    h2, h3, h4 {
      color: #fff;
    }

    p {
      color: #e0e0e0;
    }

    .config-info {
      background: #2a2a2a;
      color: #e0e0e0;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #444;
    }

    .test-controls {
      margin-bottom: 20px;
    }

    .test-controls button {
      margin: 5px;
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .test-controls button:hover {
      background: #45a049;
    }

    .results {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      max-height: 400px;
      overflow-y: auto;
    }

    .result-item {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #444;
    }

    .result-item h4 {
      color: #4CAF50;
      margin-bottom: 10px;
    }

    pre {
      background: #1a1a1a;
      color: #00ff00;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      border: 1px solid #444;
    }

    .events {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 15px;
      max-height: 300px;
      overflow-y: auto;
    }

    .event-item {
      padding: 8px;
      margin-bottom: 5px;
      background: #1a1a1a;
      border-radius: 4px;
      color: #e0e0e0;
      border: 1px solid #444;
    }

    .event-item strong {
      color: #4CAF50;
    }

    .timestamp {
      color: #999;
      font-size: 0.9em;
    }
  `]
})
export class StocksTestComponent implements OnInit, OnDestroy {
  config: any = {};
  testResults: Array<{title: string, data: any}> = [];
  events: Array<{type: string, ticker: string, timestamp: Date}> = [];
  private eventListener: any;

  constructor(private stocksService: StocksService) {}

  ngOnInit() {
    this.config = this.stocksService.getConfig();
    
    // Listen to stock events
    this.eventListener = (data: any) => {
      this.events.unshift({
        type: data.type,
        ticker: data.ticker,
        timestamp: new Date(data.timestamp)
      });
      
      // Keep only last 20 events
      if (this.events.length > 20) {
        this.events = this.events.slice(0, 20);
      }
    };
    
    EventBus.on('stock-data-received', this.eventListener);
  }

  ngOnDestroy() {
    if (this.eventListener) {
      EventBus.off('stock-data-received', this.eventListener);
    }
  }

  testAggregates() {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    this.stocksService.getAggregates(
      'AAPL',
      1,
      'day',
      from.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    ).subscribe({
      next: (data: AggregatesResponse) => {
        this.testResults.unshift({
          title: 'Aggregates Test - AAPL Daily (30 days)',
          data: {
            ticker: data.ticker,
            status: data.status,
            resultsCount: data.resultsCount,
            firstBar: data.results?.[0],
            lastBar: data.results?.[data.results.length - 1]
          }
        });
      },
      error: (err) => {
        this.testResults.unshift({
          title: 'Aggregates Test - Error',
          data: err
        });
      }
    });
  }

  testTickerDetails() {
    this.stocksService.getTickerDetails('GOOGL').subscribe({
      next: (data: TickerDetailsResponse) => {
        this.testResults.unshift({
          title: 'Ticker Details Test - GOOGL',
          data: data
        });
      },
      error: (err) => {
        this.testResults.unshift({
          title: 'Ticker Details Test - Error',
          data: err
        });
      }
    });
  }

  testSnapshot() {
    this.stocksService.getSnapshot('MSFT').subscribe({
      next: (data: SnapshotResponse) => {
        this.testResults.unshift({
          title: 'Snapshot Test - MSFT',
          data: data
        });
      },
      error: (err) => {
        this.testResults.unshift({
          title: 'Snapshot Test - Error',
          data: err
        });
      }
    });
  }

  testAllSnapshots() {
    this.stocksService.getAllTickersSnapshot(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']).subscribe({
      next: (data: AllTickersSnapshotResponse) => {
        this.testResults.unshift({
          title: 'All Snapshots Test',
          data: {
            status: data.status,
            count: data.count,
            tickers: data.tickers?.map(t => ({
              ticker: t.ticker,
              dayClose: t.day?.c,
              change: t.todaysChange,
              changePercent: t.todaysChangePerc
            }))
          }
        });
      },
      error: (err) => {
        this.testResults.unshift({
          title: 'All Snapshots Test - Error',
          data: err
        });
      }
    });
  }

  testPreviousClose() {
    this.stocksService.getPreviousClose('TSLA').subscribe({
      next: (data: AggregatesResponse) => {
        this.testResults.unshift({
          title: 'Previous Close Test - TSLA',
          data: data
        });
      },
      error: (err) => {
        this.testResults.unshift({
          title: 'Previous Close Test - Error',
          data: err
        });
      }
    });
  }

  startWatching() {
    this.stocksService.startWatching(['AAPL', 'GOOGL', 'MSFT'], 10000); // Update every 10 seconds
    this.testResults.unshift({
      title: 'Started Watching',
      data: {
        tickers: ['AAPL', 'GOOGL', 'MSFT'],
        interval: '10 seconds',
        message: 'Check EventBus events above for updates'
      }
    });
  }

  clearResults() {
    this.testResults = [];
    this.events = [];
  }
}