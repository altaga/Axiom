/**
 * 🤖 GEPPETTO - LEAN LLM UTILS
 * 
 * Standardized message building and parsing without the LangChain overhead.
 */

// ── Chat History Builder ──────────────────────────────────────────────────────
/**
 * Converts raw history from the frontend into OpenAI-compatible format.
 * - Max 10 messages.
 * - Normalizes roles.
 */
export function buildChatHistory(rawHistory = []) {
  return rawHistory.slice(-10).map(msg => ({
    role: msg.role === "human" || msg.role === "user" ? "user" : "assistant",
    content: msg.content
  }));
}

// ── Output Parser ─────────────────────────────────────────────────────────────
/**
 * Simplistic parser for raw string or JSON responses.
 */
export function parseAgentOutput(output) {
    // If it's already a string (from our new lean ZeroGAgent)
    if (typeof output === "string") return { content: output.trim() };
    
    // Fallback for objects
    const content = output?.text || output?.content || "";
    return { 
        content: content.trim() || "Agent responded with an empty message." 
    };
}

// Mock for compatibility if needed elsewhere
export function buildTools() { return []; }
export class SystemMessage { constructor(c) { this.role = "system"; this.content = c; } }
