import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { yahooB3Api, type YahooInterval } from './yahoo-api.js';
import { brapiApi } from './brapi-api.js';
import { formatToolResult } from '../../types.js';

// ── get_b3_quote (brapi.dev snapshot) ────────────────────────────────────────

const B3QuoteInputSchema = z.object({
  ticker: z.string().describe(
    "B3 ticker symbol without the .SA suffix. For example, 'PETR4' for Petrobras PN, 'VALE3' for Vale."
  ),
});

export const getB3Quote = new DynamicStructuredTool({
  name: 'get_b3_quote',
  description:
    'Fetches a real-time price snapshot for a Brazilian stock (B3) via brapi.dev, including price, change%, volume, market cap, P/E ratio, EPS, and 52-week range. Denominated in BRL (R$). Requires BRAPI_TOKEN.',
  schema: B3QuoteInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const { data, url } = await brapiApi.get(`/quote/${ticker}`);
    const results = (data as { results?: unknown[] }).results;
    return formatToolResult(results?.[0] ?? data, [url]);
  },
});

// ── get_b3_historical_prices (Yahoo Finance v8) ───────────────────────────────

const YAHOO_INTERVALS = ['1m', '5m', '15m', '30m', '60m', '1d', '1wk', '1mo'] as const;

const B3HistoricalPricesInputSchema = z.object({
  ticker: z.string().describe(
    "B3 ticker symbol without the .SA suffix. For example, 'PETR4', 'VALE3', 'ITUB4'."
  ),
  start_date: z.string().describe('Start date in YYYY-MM-DD format.'),
  end_date: z.string().describe('End date in YYYY-MM-DD format.'),
  interval: z
    .enum(YAHOO_INTERVALS)
    .default('1d')
    .describe("Price interval. Use '1d' for daily (default), '1wk' for weekly, '1mo' for monthly."),
});

export const getB3HistoricalPrices = new DynamicStructuredTool({
  name: 'get_b3_historical_prices',
  description:
    'Retrieves historical OHLCV price data for a Brazilian stock (B3) via Yahoo Finance. No API key required. Returns daily/weekly/monthly bars with open, high, low, close prices and volume, denominated in BRL (R$).',
  schema: B3HistoricalPricesInputSchema,
  func: async (input) => {
    const { meta, bars, url } = await yahooB3Api.getChart(
      input.ticker,
      input.start_date,
      input.end_date,
      input.interval as YahooInterval,
    );
    return formatToolResult({ meta, prices: bars }, [url]);
  },
});

// ── get_b3_tickers (brapi.dev list) ──────────────────────────────────────────

export const getB3Tickers = new DynamicStructuredTool({
  name: 'get_b3_tickers',
  description:
    'Returns the full list of available B3 (Brazilian stock exchange) ticker symbols via brapi.dev. Use this to discover tickers before fetching quotes. Requires BRAPI_TOKEN.',
  schema: z.object({}),
  func: async () => {
    const { data, url } = await brapiApi.get('/quote/list');
    return formatToolResult(data, [url]);
  },
});
