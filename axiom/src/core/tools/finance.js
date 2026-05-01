import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 📈 FINANCE TOOL (Yahoo Finance)
 * Fetches real-time stock quotes and historical data.
 */
export const financeTool = tool(
  async ({ symbol }) => {
    // Sanitize symbol: Llama 3 70B sometimes injects quotes or spaces (e.g. '"NVDA"' or 'NVDA ')
    const cleanSymbol = String(symbol).replace(/['" ]/g, '').toUpperCase();
    console.log(`>> [FINANCE_TOOL] Invoked with RAW symbol = "${symbol}" -> CLEANED to = "${cleanSymbol}"`);
    try {
      // 1. Fetch Quote
      const result = await yahooFinance.quote(cleanSymbol);
      
      if (!result) return `Could not find financial data for: ${symbol}`;
      
      const { 
        regularMarketPrice, 
        regularMarketChangePercent, 
        currency, 
        longName, 
        symbol: ticker,
        regularMarketDayHigh,
        regularMarketDayLow,
        regularMarketVolume
      } = result;
      
      // Return a structured string that the UI can parse if needed, 
      // or just a nice summary for the LLM.
      // We will also return a hint for the UI to render the FinanceCard.
      return JSON.stringify({
          type: "finance_quote",
          symbol: ticker,
          name: longName,
          price: regularMarketPrice,
          changePercent: regularMarketChangePercent,
          currency: currency,
          high: regularMarketDayHigh,
          low: regularMarketDayLow,
          volume: regularMarketVolume,
          rawSummary: `${longName} (${ticker}): ${regularMarketPrice} ${currency} (${regularMarketChangePercent?.toFixed(2)}%)`
      });
    } catch (err) {
      console.log(`>> [FINANCE_TOOL] Error: ${err.message}`);
      return `Error fetching finance data for ${symbol}: ${err.message}`;
    }
  },
  {
    name: "get_stock_quote",
    description: "Get real-time stock price, daily change, and market data for a given ticker symbol (e.g., AAPL, TSLA, BTC-USD).",
    schema: z.object({
      symbol: z.string().describe("The stock ticker symbol to look up."),
    }),
  }
);
