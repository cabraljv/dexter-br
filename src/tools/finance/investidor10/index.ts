import type { StructuredToolInterface } from '@langchain/core/tools';
import {
  getBrStockBalanceSheets,
  getBrStockBaselIndex,
  getBrStockDividends,
  getBrStockHistoricalPrices,
  getBrStockIncomeStatements,
  getBrStockIndicators,
  getBrStockQuote,
  getBrStockRevenueChart,
} from './stocks.js';
import {
  getBrFiiDividends,
  getBrFiiHistoricalPrices,
  getBrFiiIndicators,
  getBrFiiNetWorthHistory,
  getBrFiiQuote,
  getBrFiiVacancyHistory,
} from './fiis.js';

export {
  getBrStockBalanceSheets,
  getBrStockBaselIndex,
  getBrStockDividends,
  getBrStockHistoricalPrices,
  getBrStockIncomeStatements,
  getBrStockIndicators,
  getBrStockQuote,
  getBrStockRevenueChart,
  getBrFiiDividends,
  getBrFiiHistoricalPrices,
  getBrFiiIndicators,
  getBrFiiNetWorthHistory,
  getBrFiiQuote,
  getBrFiiVacancyHistory,
};

export function getInvestidor10MarketTools(): StructuredToolInterface[] {
  return [
    getBrStockQuote,
    getBrStockHistoricalPrices,
    getBrStockDividends,
    getBrFiiQuote,
    getBrFiiHistoricalPrices,
    getBrFiiDividends,
  ];
}

export function getInvestidor10FinanceTools(): StructuredToolInterface[] {
  return [
    getBrStockIndicators,
    getBrStockIncomeStatements,
    getBrStockBalanceSheets,
    getBrStockRevenueChart,
    getBrStockBaselIndex,
    getBrStockDividends,
    getBrFiiIndicators,
    getBrFiiDividends,
    getBrFiiVacancyHistory,
    getBrFiiNetWorthHistory,
  ];
}
