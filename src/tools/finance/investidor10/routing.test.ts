import { describe, expect, it } from 'bun:test';
import {
  MARKET_DATA_TOOLS,
  buildMarketDataRouterPrompt,
} from '../get-market-data.js';
import {
  FINANCE_TOOLS,
  buildFinancialsRouterPrompt,
} from '../get-financials.js';

describe('brazil router wiring', () => {
  it('prefers Investidor10 market tools ahead of B3 fallbacks', () => {
    const toolNames = MARKET_DATA_TOOLS.map((tool) => tool.name);
    const brStockQuoteIndex = toolNames.indexOf('get_br_stock_quote');
    const b3QuoteIndex = toolNames.indexOf('get_b3_quote');
    const brFiiQuoteIndex = toolNames.indexOf('get_br_fii_quote');

    expect(brStockQuoteIndex).toBeGreaterThan(-1);
    expect(brFiiQuoteIndex).toBeGreaterThan(-1);
    expect(b3QuoteIndex).toBeGreaterThan(-1);
    expect(brStockQuoteIndex).toBeLessThan(b3QuoteIndex);
  });

  it('documents FII and Investidor10-first routing in the market-data prompt', () => {
    const prompt = buildMarketDataRouterPrompt();

    expect(prompt).toContain('get_br_fii_quote');
    expect(prompt).toContain('Investidor10 should be preferred for Brazilian stocks and FIIs');
    expect(prompt).toContain('FII tickers usually end in 11');
  });

  it('includes Investidor10 financial tools for Brazilian stocks and FIIs', () => {
    const toolNames = FINANCE_TOOLS.map((tool) => tool.name);

    expect(toolNames).toContain('get_br_stock_indicators');
    expect(toolNames).toContain('get_br_stock_income_statements');
    expect(toolNames).toContain('get_br_fii_indicators');
    expect(toolNames).toContain('get_br_fii_vacancy_history');
  });

  it('documents Investidor10-first brazil routing in the financials prompt', () => {
    const prompt = buildFinancialsRouterPrompt();

    expect(prompt).toContain('Investidor10 primary');
    expect(prompt).toContain('get_br_stock_indicators');
    expect(prompt).toContain('get_br_fii_indicators');
    expect(prompt).toContain('Brazilian FII tickers usually end in 11');
  });
});
