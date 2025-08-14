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

export interface Snapshot {
  ticker: string;
  day?: DayValues;
  min?: MinuteValues;
  prevDay?: DayValues;
  updated?: number;
  todaysChange?: number;
  todaysChangePerc?: number;
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