import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { investidor10Api } from './api.js';
import {
  extractComparatorRow,
  normalizeCurrencySeriesMap,
  normalizeSeries,
  summarizeIntradaySeries,
} from './normalizers.js';
import { resolveInvestidor10Fii } from './resolver.js';

const FiiTickerSchema = z.object({
  ticker: z.string().describe("Brazilian FII ticker. For example, 'HGLG11', 'KNCR11', 'MXRF11'."),
});

const FiiHistorySchema = z.object({
  ticker: z.string().describe("Brazilian FII ticker. For example, 'HGLG11', 'KNCR11', 'MXRF11'."),
  days: z
    .number()
    .default(3650)
    .describe('Number of calendar days to request from Investidor10. Use 30, 180, 365, 1825, or 3650.'),
});

let fiiComparatorCache:
  | Promise<{ data: unknown; url: string }>
  | null = null;

async function getFiiComparatorAll() {
  if (!fiiComparatorCache) {
    fiiComparatorCache = investidor10Api.getJson('/api/fii/comparador/table/24/all/');
  }
  return fiiComparatorCache;
}

async function getFiiComparatorRow(ticker: string) {
  const { data, url } = await getFiiComparatorAll();
  return { row: extractComparatorRow(data, ticker), url };
}

async function loadFiiQuotePayload(ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const asset = await resolveInvestidor10Fii(normalizedTicker);

  const [intradayResult, historicalResult, comparatorResult] = await Promise.all([
    investidor10Api.getJson(`/api/quotations/one-day/${normalizedTicker}/`, { referer: asset.pageUrl }),
    investidor10Api.getJson(`/api/fii/cotacoes/chart/${asset.fiiId}/3650/`, { referer: asset.pageUrl }),
    getFiiComparatorRow(normalizedTicker),
  ]);

  const intradaySeries = normalizeCurrencySeriesMap(intradayResult.data as Record<string, unknown>);
  const realIntraday = intradaySeries.find((series) => series.currency === 'real')?.points ?? [];
  const historical = normalizeSeries(
    (historicalResult.data as Record<string, unknown>).real ?? historicalResult.data
  );

  return {
    asset,
    intraday: intradaySeries,
    historical,
    snapshot: summarizeIntradaySeries(realIntraday),
    comparator: comparatorResult.row,
    sourceUrls: [intradayResult.url, historicalResult.url, comparatorResult.url, asset.pageUrl],
  };
}

export const getBrFiiQuote = new DynamicStructuredTool({
  name: 'get_br_fii_quote',
  description:
    'Fetches the latest intraday quote data for a Brazilian FII from Investidor10, including the current price, intraday open/high/low/close, and the comparator snapshot values such as dividend yield and P/VP.',
  schema: FiiTickerSchema,
  func: async (input) => {
    const result = await loadFiiQuotePayload(input.ticker);
    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: result.asset.ticker,
        currency: 'BRL',
        fiiId: result.asset.fiiId,
        manager: result.asset.manager,
        administrator: result.asset.administrator,
        description: result.asset.description,
        snapshot: result.snapshot,
        intraday: result.intraday,
        historicalPrices: result.historical,
        comparator: result.comparator,
      },
      result.sourceUrls,
    );
  },
});

export const getBrFiiHistoricalPrices = new DynamicStructuredTool({
  name: 'get_br_fii_historical_prices',
  description:
    'Retrieves historical price series for a Brazilian FII from Investidor10. Returns the long-range price history in BRL.',
  schema: FiiHistorySchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Fii(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/fii/cotacoes/chart/${asset.fiiId}/${input.days}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: asset.ticker,
        currency: 'BRL',
        fiiId: asset.fiiId,
        days: input.days,
        prices: normalizeSeries((data as Record<string, unknown>).real ?? data),
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrFiiDividends = new DynamicStructuredTool({
  name: 'get_br_fii_dividends',
  description:
    'Fetches dividend distribution history and dividend-yield history for a Brazilian FII from Investidor10.',
  schema: FiiHistorySchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Fii(input.ticker);

    const [dividendsResult, yieldResult] = await Promise.all([
      investidor10Api.getJson(`/api/fii/dividendos/chart/${asset.fiiId}/${input.days}/`, {
        referer: asset.pageUrl,
      }),
      investidor10Api.getJson(`/api/fii/dividend-yield/chart/${asset.fiiId}/${input.days}/`, {
        referer: asset.pageUrl,
      }),
    ]);

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: asset.ticker,
        currency: 'BRL',
        fiiId: asset.fiiId,
        dividendHistory: normalizeSeries(dividendsResult.data),
        dividendYieldHistory: normalizeSeries(yieldResult.data),
      },
      [dividendsResult.url, yieldResult.url, asset.pageUrl],
    );
  },
});

export const getBrFiiIndicators = new DynamicStructuredTool({
  name: 'get_br_fii_indicators',
  description:
    'Fetches current FII indicator data from Investidor10, including dividend yield, P/VP, fund net worth, and page-level metadata such as manager and administrator.',
  schema: FiiTickerSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Fii(input.ticker);
    const comparator = await getFiiComparatorRow(asset.ticker);

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: asset.ticker,
        currency: 'BRL',
        fiiId: asset.fiiId,
        manager: asset.manager,
        administrator: asset.administrator,
        description: asset.description,
        comparator: comparator.row,
      },
      [comparator.url, asset.pageUrl],
    );
  },
});

export const getBrFiiVacancyHistory = new DynamicStructuredTool({
  name: 'get_br_fii_vacancy_history',
  description:
    'Fetches the historical vacancy-rate series for a Brazilian FII from Investidor10.',
  schema: FiiTickerSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Fii(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/fii/historico-taxa-vacancia/${asset.fiiId}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: asset.ticker,
        currency: 'BRL',
        fiiId: asset.fiiId,
        vacancyHistory: normalizeSeries(data),
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});

export const getBrFiiNetWorthHistory = new DynamicStructuredTool({
  name: 'get_br_fii_net_worth_history',
  description:
    'Fetches the historical fund net-worth series for a Brazilian FII from Investidor10.',
  schema: FiiTickerSchema,
  func: async (input) => {
    const asset = await resolveInvestidor10Fii(input.ticker);
    const { data, url } = await investidor10Api.getJson(
      `/api/fii/valor-patrimonial/chart/${asset.fiiId}/`,
      {
        referer: asset.pageUrl,
      },
    );

    return formatToolResult(
      {
        provider: 'investidor10',
        assetType: 'fii',
        ticker: asset.ticker,
        currency: 'BRL',
        fiiId: asset.fiiId,
        netWorthHistory: normalizeSeries(data),
        raw: data,
      },
      [url, asset.pageUrl],
    );
  },
});
