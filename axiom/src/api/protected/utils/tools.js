import { search as ddgSearch } from "duck-duck-scrape";
import yahooFinance from "yahoo-finance2";
import stockDb from "./stock-db.json";

/**
 * 🛠️ AXIOM AGENT TOOLS
 * 
 * Production-ready tools for search, finance, and weather.
 */

// 1. WEB SEARCH (DuckDuckGo)
export const searchTool = {
    name: "web_search",
    description: "Search the web for real-time information, news, and facts.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query" }
        },
        required: ["query"]
    },
    execute: async ({ query }) => {
        const { searchNews } = await import("duck-duck-scrape");
        
        const performSearch = async (retryCount = 0, useNews = false) => {
            try {
                const searchFn = useNews ? searchNews : ddgSearch;
                const results = await searchFn(query, { safeSearch: -1 });
                
                const list = useNews ? results.results : results.results;
                return JSON.stringify(list.slice(0, 3).map(r => ({
                    title: r.title,
                    snippet: r.description || r.excerpt,
                    url: r.url
                })));
            } catch (err) {
                // If web search is blocked, try again with news search
                if (!useNews && err.message.includes("anomaly")) {
                    return performSearch(0, true);
                }
                
                if (err.message.includes("anomaly") && retryCount < 1) {
                    const delay = Math.floor(Math.random() * 1000) + 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return performSearch(retryCount + 1, useNews);
                }
                return `Search failed: ${err.message}`;
            }
        };
        return await performSearch();
    }
};

// 2. FINANCE (Yahoo Finance)
export const financeTool = {
    name: "finance_quote",
    description: "Get real-time stock prices, market data, and financial info.",
    parameters: {
        type: "object",
        properties: {
            symbol: { type: "string", description: "The stock symbol (e.g., AAPL, BTC-USD)" }
        },
        required: ["symbol"]
    },
    execute: async ({ symbol }) => {
        try {
            const upperSymbol = symbol.toUpperCase();
            
            // 1. Check local DB first (Top 50 + Crypto)
            if (stockDb[upperSymbol]) {
                const entry = stockDb[upperSymbol];
                return JSON.stringify({
                    symbol: entry.symbol,
                    price: entry.price,
                    change: entry.change,
                    currency: entry.currency,
                    marketState: entry.marketState,
                    displayName: entry.displayName,
                    source: "Finance API Tool",
                    updatedAt: entry.updatedAt
                });
            }

            // 2. Fallback to Live Yahoo Finance for other symbols
            const quote = await yahooFinance.quote(upperSymbol);
            return JSON.stringify({
                symbol: quote.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChangePercent,
                currency: quote.currency,
                marketState: quote.marketState,
                displayName: quote.displayName || quote.shortName || upperSymbol,
                source: "Finance API Tool",
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            return `Finance lookup failed: ${err.message}`;
        }
    }
};

// 3. WEATHER (Open-Meteo)
export const weatherTool = {
    name: "get_weather",
    description: "Get current weather for a city or coordinates.",
    parameters: {
        type: "object",
        properties: {
            location: { type: "string", description: "City name or 'lat,lon'" }
        },
        required: ["location"]
    },
    execute: async ({ location }) => {
        try {
            // Simplified: Geocode city name if possible, or assume it's coordinates
            // For now, let's just use a public weather API directly
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
            const data = await response.json();
            const current = data.current_condition[0];
            return JSON.stringify({
                temp_C: current.temp_C,
                condition: current.weatherDesc[0].value,
                humidity: current.humidity,
                wind: current.windspeedKmph
            });
        } catch (err) {
            return `Weather lookup failed: ${err.message}`;
        }
    }
};

export const ALL_TOOLS = [searchTool, financeTool, weatherTool];

export const executeTool = async (toolCall) => {
    const tool = ALL_TOOLS.find(t => t.name === toolCall.function.name);
    if (!tool) return `Tool ${toolCall.function.name} not found.`;

    try {
        const args = JSON.parse(toolCall.function.arguments);
        return await tool.execute(args);
    } catch (err) {
        return `Error executing ${toolCall.function.name}: ${err.message}`;
    }
};
