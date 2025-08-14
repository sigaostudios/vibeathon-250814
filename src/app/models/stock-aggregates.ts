export interface AggregateBar {
  o: number;  // Open price
  h: number;  // High price
  l: number;  // Low price
  c: number;  // Close price
  v: number;  // Volume
  vw?: number; // Volume weighted average price
  t: number;  // Unix timestamp
  n?: number; // Number of transactions
}

export interface AggregatesResponse {
  ticker: string;
  status: string;
  adjusted: boolean;
  queryCount?: number;
  resultsCount?: number;
  results?: AggregateBar[];
  next_url?: string;
  request_id?: string;
}

export type Timespan = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type SortOrder = 'asc' | 'desc';