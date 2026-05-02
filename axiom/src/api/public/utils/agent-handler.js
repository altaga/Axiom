import { get0GAgent } from "../../../core/0g-registry";
import {
    SystemMessage,
    buildChatHistory,
    parseAgentOutput
} from "../../../core/llm";
import { MQTTRequestTracker } from "../../../core/ws-logger";

/**
 * 🛠️ PUBLIC AGENT HANDLER
 * 
 * Localized logic for public agent requests.
 * Isolated for future deletion of the public tier.
 */

const MODEL_NAME = "deepseek-chat-v3-0324";

export const handleAgentRequest = async (c, tier, systemPrompt) => {
    const traceId = c.req.header("X-Axiom-Trace-Id") || `trace-${Date.now()}`;
    const body = await c.req.json();
    const message = body.message || body.prompt;
    const history = body.history || [];

    const tracker = new MQTTRequestTracker(traceId, c.req.path);

    try {
        await tracker.connect();
        await tracker.log("REQUEST_START", { tier, model: MODEL_NAME });

        const agent = await get0GAgent(tier, MODEL_NAME, systemPrompt, tracker);

        const messages = [
            new SystemMessage(systemPrompt),
            ...buildChatHistory(history),
            { role: "user", content: message }
        ];

        await tracker.log("LLM_INVOKE_START", { msgCount: messages.length });
        const response = await agent.invoke(messages);
        const parsed = parseAgentOutput(response.text);

        await tracker.log("REQUEST_SUCCESS", { content: parsed.content });

        return c.json({
            status: "SUCCESS",
            message: parsed.content,
            answer: parsed.content,
            traceId: traceId,
            receipt: response.receipt
        });
    } catch (err) {
        console.error(`PUBLIC_${tier}_CRASH:`, err.message);
        await tracker.log("PIPELINE_COLLAPSE", { error: err.message });
        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    } finally {
        await tracker.close();
    }
};
