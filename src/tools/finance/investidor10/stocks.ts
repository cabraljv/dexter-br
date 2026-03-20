import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { brapiApi } from '../b3/brapi-api.js';
import { yahooB3Api } from '../b3/yahoo-api.js';
import { investidor10Api } from './api.js';
import {
  normalizeCurrencySeriesMap,
  normalizeHistoricalIndicators,
  normalizeSeries,
  normalizeStatementTable,
  parseDividendMapRow,
  summarizeIntradaySeries,
} from './normalizers.js';
import { resolveInvestidor10Stock } from './resolver.js';

const StockTickerSchema = z.object({
  ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
});

const StockHistorySchema = z.object({
  ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
  days: z
    .number()
    .default(3650)
    .describe('Number of calendar days to request from Investidor10. Use 30, 180, 365, 1825, or 3650.'),
  adjusted_payments: z
    .boolean()
    .default(true)
    .describe('Whether to use the adjusted price series that accounts for payments.'),
});

const StockIndicatorsSchema = z.object({
  ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
  years: z.number().default(10).describe('Historical indicator window in years. Typical values: 2, 5, or 10.'),
});

const StockIncomeStatementsSchema = z.object({
  ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
  periods: z.number().default(10).describe('Number of periods to request from Investidor10.'),
  frequency: z
    .enum(['annual', 'quarterly'])
    .default('annual')
    .describe("Financial statement frequency. 'annual' maps to anual, 'quarterly' maps to trimestral."),
});

const StockBalanceSheetSchema = z.object({
  ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
  yearly: z.boolean().default(true).describe('Whether to request the annual balance-sheet view.'),
});

async function fallbackQuote(ticker: string) {
  if (process.env.BRAPI_TOKEN) {
    const { data, url } = await brapiApi.get(`/quote/${ticker}`);
    return {
      data: {
        provider: 'brapi',
        assetType: 'stock',
        ticker,
        currency: 'BRL',
        snapshot: (data as { results?: unknown[] }).results?.[0] ?? data,
      },
      sourceUrls: [url],
    };
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 30);
  const { meta, bars, url } = await yahooB3Api.getChart(
    ticker,
    start.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10),
    '1d',
  );

  return {
    data: {
      provider: 'yahoo_finance',
      assetType: 'stock',
      ticker,
      currency: 'BRL',
      snapshot: {
        price: bars.at(-1)?.close ?? null,
        open: bars.at(-1)?.open ?? null,
        high: bars.at(-1)?.high ?? null,
        low: bars.at(-1)?.low ?? null,
        volume: bars.at(-1)?.volume ?? null,
        meta,
      },
      prices: bars,
    },
    sourceUrls: [url],
  };
}

async function loadInvestidor10StockQuote(ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const { data: intradayPayload, url } = await investidor10Api.getJson(
    `/api/quotations/one-day/${normalizedTicker}/`,
    {
      referer: `${process.env.INVESTIDOR10_REFERER_BASE ?? 'https://investidor10.com.br'}/acoes/${normalizedTicker.toLowerCase()}/`,
    },
  );

  const currencySeries = normalizeCurrencySeriesMap(intradayPayload as Record<string, unknown>);
  const realSeries = currencySeries.find((series) => series.currency === 'real')?.points ?? [];

  return {
    data: {
      provider: 'investidor10',
      assetType: 'stock',
      ticker: normalizedTicker,
      currency: 'BRL',
      series: currencySeries,
      snapshot: summarizeIntradaySeries(realSeries),
      lastUpdatedAt: realSeries.at(-1)?.date ?? null,
      raw: intradayPayload,
    },
    sourceUrls: [url],
  };
}

export const getBrStockQuote = new DynamicStructuredTool({
  name: 'get_br_stock_quote',
  description:
    'Fetches the latest intraday quote data for a Brazilian stock from Investidor10, including current price, intraday open/high/low/close, and timestamp. Falls back to existing B3 providers if Investidor10 is unavailable.',
  schema: StockTickerSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();

    try {
      const result = await loadInvestidor10StockQuote(ticker);
      return formatToolResult(result.data, result.sourceUrls);
    } catch {
      const fallback = await fallbackQuote(ticker);
      return formatToolResult(fallback.data, fallback.sourceUrls);
    }
  },
});

export const getBrStockHistoricalPrices = new DynamicStructuredTool({
  name: 'get_br_stock_historical_prices',
  description:
    'Retrieves historical adjusted price series for a Brazilian stock from Investidor10. Returns long-range daily history in BRL and preserves the raw multi-currency payload from Investidor10.',
  schema: StockHistorySchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();

    try {
      const { data, url } = await investidor10Api.getJson(
        `/api/cotacoes/acao/chart/${ticker}/${input.days}/${input.adjusted_payments ? 'true' : 'false'}`,
        {
          referer: `${process.env.INVESTIDOR10_REFERER_BASE ?? 'https://investidor10.com.br'}/acoes/${ticker.toLowerCase()}/`,
        },
      );

      const currencySeries = normalizeCurrencySeriesMap(data as Record<string, unknown>);
      return formatToolResult(
        {
          provider: 'investidor10',
          assetType: 'stock',
          ticker,
          currency: 'BRL',
          days: input.days,
          adjustedPayments: input.adjusted_payments,
          series: currencySeries,
          raw: data,
        },
        [url],
      );
    } catch {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - input.days);
      const { meta, bars, url } = await yahooB3Api.getChart(
        ticker,
        start.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10),
        '1d',
      );

      return formatToolResult(
        {
          provider: 'yahoo_finance',
          assetType: 'stock',
          ticker,
          currency: 'BRL',
          meta,
          prices: bars,
        },
        [url],
      );
    }
  },
});

export const getBrStockIndicators = new DynamicStructuredTool({
  name: 'get_br_stock_indicators',
  description:
    'Fetches current and historical valuation, profitability, leverage, liquidity, and growth indicators for a Brazilian stock from Investidor10.',
  schema: StockIndicatorsSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/historico-indicadores/${asset.tickerId}/${input.years}?v=2`,
      {
        referer: asset.pageUrl,
      },
    );

    const normalized = normalizeHistoricalIndicators(data as Record<string, unknown>);
    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        tickerId: asset.tickerId,
        companyId: asset.companyId,
        ...normalized,
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrStockDividends = new DynamicStructuredTool({
  name: 'get_br_stock_dividends',
  description:
    'Fetches dividend and dividend-yield history for a Brazilian stock from Investidor10, plus the monthly dividend calendar probabilities exposed in the dividends map.',
  schema: StockHistorySchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const referer = asset.pageUrl;

    const [dividendsResult, yieldResult, dividendsMapResult] = await Promise.allSettled([
      investidor10Api.getJson(`/api/dividendos/chart/${asset.tickerId}/${input.days}/`, { referer }),
      investidor10Api.getJson(`/api/dividend-yield/chart/${asset.tickerId}/${input.days}/`, { referer }),
      investidor10Api.getJson('/api/acoes/dividends-map', { referer }),
    ]);

    const dividends =
      dividendsResult.status === 'fulfilled' ? normalizeSeries(dividendsResult.value.data) : [];
    const dividendYield =
      yieldResult.status === 'fulfilled' ? normalizeSeries(yieldResult.value.data) : [];
    const calendar =
      dividendsMapResult.status === 'fulfilled'
        ? parseDividendMapRow(dividendsMapResult.value.data, asset.ticker)
        : null;

    const sourceUrls = [asset.pageUrl];
    if (dividendsResult.status === 'fulfilled') sourceUrls.push(dividendsResult.value.url);
    if (yieldResult.status === 'fulfilled') sourceUrls.push(yieldResult.value.url);
    if (dividendsMapResult.status === 'fulfilled') sourceUrls.push(dividendsMapResult.value.url);

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        tickerId: asset.tickerId,
        dividendHistory: dividends,
        dividendYieldHistory: dividendYield,
        dividendCalendar: calendar,
      },
      sourceUrls,
    );
  },
});

export const getBrStockIncomeStatements = new DynamicStructuredTool({
  name: 'get_br_stock_income_statements',
  description:
    'Fetches Investidor10 income statement tables for a Brazilian stock, including revenue, gross profit, net income, EBIT, EBITDA, taxes, and margin rows across annual or quarterly periods.',
  schema: StockIncomeStatementsSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const frequency = input.frequency === 'quarterly' ? 'trimestral' : 'anual';
    const { data, url } = await investidor10Api.getJson(
      `/api/balancos/balancoresultados/chart/${asset.companyId}/${input.periods}/${frequency}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        companyId: asset.companyId,
        frequency: input.frequency,
        table: normalizeStatementTable(data),
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrStockBalanceSheets = new DynamicStructuredTool({
  name: 'get_br_stock_balance_sheets',
  description:
    'Fetches the Investidor10 balance-sheet table for a Brazilian stock. Returns the raw table plus a normalized period/metric representation.',
  schema: StockBalanceSheetSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/balancos/balancopatrimonial/chart/${asset.companyId}/${input.yearly}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        companyId: asset.companyId,
        yearly: input.yearly,
        table: normalizeStatementTable(data),
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrStockRevenueChart = new DynamicStructuredTool({
  name: 'get_br_stock_revenue_chart',
  description:
    'Fetches the Investidor10 net revenue chart for a Brazilian stock as a time series in BRL.',
  schema: z.object({
    ticker: z.string().describe("Brazilian stock ticker. For example, 'PETR4', 'VALE3', 'ITUB4'."),
    days: z.number().default(3650).describe('Number of calendar days to request.'),
    quarterly: z.boolean().default(true).describe('Whether to use the quarterly chart variant.'),
  }),
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/balancos/receitaliquida/chart/${asset.companyId}/${input.days}/${input.quarterly ? 1 : 0}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        companyId: asset.companyId,
        days: input.days,
        quarterly: input.quarterly,
        points: normalizeSeries(data),
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrStockBaselIndex = new DynamicStructuredTool({
  name: 'get_br_stock_basel_index',
  description:
    'Fetches the Basel index chart exposed by Investidor10 for Brazilian financial institutions when the company page supports it.',
  schema: z.object({
    ticker: z.string().describe("Brazilian bank or insurer ticker. For example, 'BBDC3', 'ITUB4', 'BBAS3'."),
    days: z.number().default(3650).describe('Number of calendar days to request.'),
  }),
  func: async (input) => {
    const asset = await resolveInvestidor10Stock(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/balancos/indice-basileia-chart/${asset.companyId}/${input.days}/?v=4`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'stock',
        ticker: asset.ticker,
        currency: 'BRL',
        companyId: asset.companyId,
        days: input.days,
        points: normalizeSeries(data),
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});
