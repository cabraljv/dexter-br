export interface Investidor10ResolvedStock {
  assetType: 'stock';
  ticker: string;
  slug: string;
  tickerId: number;
  companyId: number;
  pageUrl: string;
}

export interface Investidor10ResolvedFii {
  assetType: 'fii';
  ticker: string;
  slug: string;
  fiiId: number;
  pageUrl: string;
  administrator?: string;
  manager?: string;
  description?: string;
}

export interface NormalizedTimeSeriesPoint {
  date: string;
  rawDate: string;
  value: number | null;
}

export interface NormalizedCurrencySeries {
  currency: string;
  points: NormalizedTimeSeriesPoint[];
}

export interface NormalizedIndicatorHistoryItem {
  year: string;
  value: number | null;
  type: string | null;
  label: string;
  description?: string;
}

export interface NormalizedIndicatorSeries {
  key: string;
  label: string;
  type: string | null;
  currentValue: number | null;
  history: NormalizedIndicatorHistoryItem[];
}
