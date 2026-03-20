import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { brapiApi } from './brapi-api.js';
import { formatToolResult } from '../../types.js';

const PeriodSchema = z
  .enum(['annual', 'quarterly'])
  .default('annual')
  .describe("Reporting period: 'annual' for yearly, 'quarterly' for quarterly.");

// ── get_b3_income_statements ──────────────────────────────────────────────────

const B3IncomeStatementsInputSchema = z.object({
  ticker: z.string().describe(
    "B3 ticker symbol without the .SA suffix. For example, 'ITUB4', 'PETR4'."
  ),
  period: PeriodSchema,
});

export const getB3IncomeStatements = new DynamicStructuredTool({
  name: 'get_b3_income_statements',
  description:
    "Fetches income statement history for a Brazilian stock (B3) via brapi.dev, including revenues, net income, EBITDA, and expenses. Denominated in BRL (R$). Requires BRAPI_TOKEN.",
  schema: B3IncomeStatementsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const module =
      input.period === 'quarterly'
        ? 'incomeStatementHistoryQuarterly'
        : 'incomeStatementHistory';
    const { data, url } = await brapiApi.get(`/quote/${ticker}`, { modules: module });
    const results = (data as { results?: unknown[] }).results;
    const first = (results?.[0] ?? {}) as Record<string, unknown>;
    return formatToolResult(first[module] ?? first, [url]);
  },
});

// ── get_b3_balance_sheets ─────────────────────────────────────────────────────

const B3BalanceSheetsInputSchema = z.object({
  ticker: z.string().describe(
    "B3 ticker symbol without the .SA suffix. For example, 'ITUB4', 'VALE3'."
  ),
  period: PeriodSchema,
});

export const getB3BalanceSheets = new DynamicStructuredTool({
  name: 'get_b3_balance_sheets',
  description:
    "Fetches balance sheet history for a Brazilian stock (B3) via brapi.dev, including total assets, liabilities, shareholders' equity, and cash. Denominated in BRL (R$). Requires BRAPI_TOKEN.",
  schema: B3BalanceSheetsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const module =
      input.period === 'quarterly'
        ? 'balanceSheetHistoryQuarterly'
        : 'balanceSheetHistory';
    const { data, url } = await brapiApi.get(`/quote/${ticker}`, { modules: module });
    const results = (data as { results?: unknown[] }).results;
    const first = (results?.[0] ?? {}) as Record<string, unknown>;
    return formatToolResult(first[module] ?? first, [url]);
  },
});

// ── get_b3_key_statistics ─────────────────────────────────────────────────────

const B3KeyStatisticsInputSchema = z.object({
  ticker: z.string().describe(
    "B3 ticker symbol without the .SA suffix. For example, 'PETR4', 'VALE3', 'ITUB4'."
  ),
});

export const getB3KeyStatistics = new DynamicStructuredTool({
  name: 'get_b3_key_statistics',
  description:
    "Fetches key financial statistics for a Brazilian stock (B3) via brapi.dev, including P/E, P/VP (P/B), ROE, profit margins, EV/EBITDA, beta, and shares outstanding. Requires BRAPI_TOKEN.",
  schema: B3KeyStatisticsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const module = 'defaultKeyStatistics';
    const { data, url } = await brapiApi.get(`/quote/${ticker}`, { modules: module });
    const results = (data as { results?: unknown[] }).results;
    const first = (results?.[0] ?? {}) as Record<string, unknown>;
    return formatToolResult(first[module] ?? first, [url]);
  },
});
