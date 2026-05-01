import { search as ddgSearch } from "duck-duck-scrape";
import yahooFinance from "yahoo-finance2";

/**
 * 🛠️ GEPPETTO AGENT TOOLS
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
        try {
            const results = await ddgSearch(query, { safeSearch: 1 });
            return JSON.stringify(results.results.slice(0, 3).map(r => ({
                title: r.title,
                snippet: r.description,
                url: r.url
            })));
        } catch (err) {
            return `Search failed: ${err.message}`;
        }
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
            const quote = await yahooFinance.quote(symbol);
            return JSON.stringify({
                symbol: quote.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChangePercent,
                currency: quote.currency,
                marketState: quote.marketState
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
