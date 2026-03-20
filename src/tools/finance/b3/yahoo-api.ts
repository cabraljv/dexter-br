import { logger } from '../../../utils/logger.js';

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface OHLCVBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface ChartMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  regularMarketPrice: number;
  regularMarketTime: number;
  chartPreviousClose: number;
}

export interface ChartResult {
  meta: ChartMeta;
  bars: OHLCVBar[];
  url: string;
}

export type YahooInterval = '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1wk' | '1mo';

export const yahooB3Api = {
  async getChart(
    ticker: string,
    startDate: string,
    endDate: string,
    interval: YahooInterval = '1d',
  ): Promise<ChartResult> {
    const symbol = `${ticker.trim().toUpperCase()}.SA`;
    const period1 = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
    const period2 = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

    const url = new URL(`${BASE_URL}/${encodeURIComponent(symbol)}`);
    url.searchParams.set('period1', String(period1));
    url.searchParams.set('period2', String(period2));
    url.searchParams.set('interval', interval);

    const urlStr = url.toString();

    let response: Response;
    try {
      response = await fetch(urlStr, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Yahoo Finance] network error: ${symbol} — ${message}`);
      throw new Error(`[Yahoo Finance] request failed for ${symbol}: ${message}`);
    }

    if (!response.ok) {
      const detail = `${response.status} ${response.statusText}`;
      logger.error(`[Yahoo Finance] error: ${symbol} — ${detail}`);
      throw new Error(`[Yahoo Finance] request failed: ${detail}`);
    }

    const data = await response.json().catch(() => {
      throw new Error(`[Yahoo Finance] invalid JSON response for ${symbol}`);
    });

    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error(`[Yahoo Finance] no data returned for ${symbol}`);
    }

    const meta: ChartMeta = result.meta;
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};

    const bars: OHLCVBar[] = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close: quote.close?.[i] ?? null,
      volume: quote.volume?.[i] ?? null,
    }));

    return { meta, bars, url: urlStr };
  },
};
