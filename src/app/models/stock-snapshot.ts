export interface DayValues {
  o: number;  // Open
  h: number;  // High
  l: number;  // Low
  c: number;  // Close
  v: number;  // Volume
  vw?: number; // Volume weighted average price
}

export interface MinuteValues extends DayValues {
  av: number; // Aggregate volume
  t: number;  // Timestamp
  n: number;  // Number of items
}

export interface QuoteValues {
  ask: number;           // Ask price
  ask_size: number;      // Ask size
  bid: number;           // Bid price  
  bid_size: number;      // Bid size
  last_quote: {
    ask: number;
    ask_size: number;
    bid: number;
    bid_size: number;
    exchange: number;
    timestamp: number;
  };
}

export interface TradeValues {
  conditions: number[];  // Trade conditions
  exchange: number;      // Exchange ID
  price: number;         // Trade price
  sip_timestamp: number; // SIP timestamp  
  size: number;          // Trade size
  timestamp: number;     // Trade timestamp
}

export interface Snapshot {
  ticker: string;
  day?: DayValues;
  min?: MinuteValues;
  prevDay?: DayValues;
  lastQuote?: QuoteValues;
  lastTrade?: TradeValues;
  updated?: number;
  todaysChange?: number;
  todaysChangePerc?: number;
  fmv?: number;         // Fair market value (optional, plan-dependent)
}

export interface SnapshotResponse {
  status: string;
  ticker?: Snapshot;
  request_id?: string;
}

export interface AllTickersSnapshotResponse {
  status: string;
  tickers?: Snapshot[];
  count?: number;
  request_id?: string;
}