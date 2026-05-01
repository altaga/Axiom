import { get0GAgent } from "../../../../core/0g-registry";
import { 
  SystemMessage, 
  buildChatHistory, 
  parseAgentOutput 
} from "../../../../core/llm";

/**
 * 🛠️ PROTECTED AGENT HANDLER
 * 
 * Localized logic for protected agent requests.
 * Secured via x402 on the mounting Hub.
 */

const MODEL_NAME = "deepseek-chat-v3-0324";

export const handleAgentRequest = async (c, tier, systemPrompt) => {
    const traceId = c.req.header("X-Geppetto-Trace-Id") || `trace-${Date.now()}`;
    const body = await c.req.json();
    const message = body.message || body.prompt;
    const history = body.history || [];

    try {
        const agent = await get0GAgent(tier, MODEL_NAME, systemPrompt);
        
        const messages = [
            new SystemMessage(systemPrompt),
            ...buildChatHistory(history),
            { role: "user", content: message }
        ];

        const response = await agent.invoke(messages);
        const parsed = parseAgentOutput(response.text);

        return c.json({
            status: "SUCCESS",
            message: parsed.content,
            answer: parsed.content,
            traceId: traceId,
            receipt: response.receipt
        });
    } catch (err) {
        console.error(`PROTECTED_${tier}_CRASH:`, err.message);
        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    }
};
