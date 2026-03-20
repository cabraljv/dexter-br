import type { StructuredToolInterface } from '@langchain/core/tools';
import { getB3Quote, getB3HistoricalPrices, getB3Tickers } from './quote.js';
import { getB3IncomeStatements, getB3BalanceSheets, getB3KeyStatistics } from './fundamentals.js';

export {
  getB3Quote,
  getB3HistoricalPrices,
  getB3Tickers,
  getB3IncomeStatements,
  getB3BalanceSheets,
  getB3KeyStatistics,
};

function hasBrapiToken(): boolean {
  return Boolean(process.env.BRAPI_TOKEN);
}

/**
 * Returns market data tools for B3 (Brazilian stocks).
 * - get_b3_historical_prices: always available (Yahoo Finance, no key needed)
 * - get_b3_quote, get_b3_tickers: only when BRAPI_TOKEN is set
 */
export function getB3MarketTools(): StructuredToolInterface[] {
  const tools: StructuredToolInterface[] = [getB3HistoricalPrices];
  if (hasBrapiToken()) {
    tools.push(getB3Quote, getB3Tickers);
  }
  return tools;
}

/**
 * Returns fundamentals tools for B3 (Brazilian stocks).
 * All require BRAPI_TOKEN.
 */
export function getB3FinanceTools(): StructuredToolInterface[] {
  if (!hasBrapiToken()) {
    return [];
  }
  return [getB3IncomeStatements, getB3BalanceSheets, getB3KeyStatistics];
}
