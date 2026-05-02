import { get0GAgent } from "../../../core/0g-registry";
import { parseAgentOutput } from "../../../core/llm";
import { ALL_TOOLS } from "./tools";
import { MQTTRequestTracker } from "../../../core/ws-logger";

/**
 * 🛠️ PROTECTED AGENT HANDLER
 * 
 * Localized logic for protected agent requests.
 * Secured via x402 on the mounting Hub.
 */

export const handleAgentRequest = async (c, tier, modelName, systemPrompt) => {
    const traceId = c.req.header("X-Axiom-Trace-Id") || `trace-${Date.now()}`;
    const toolsEnabled = c.req.header("X-Tools-Enabled") === "true";
    const body = await c.req.json();
    const message = body.message || body.prompt;
    const history = body.history || [];

    const tracker = new MQTTRequestTracker(traceId, c.req.path);
    console.log(`[HANDLER_START] Tier: ${tier} | Model: ${modelName}`);
    
    try {
        await tracker.connect();
        const agent = await get0GAgent(tier, modelName, systemPrompt, tracker);

        await tracker.log("REQUEST_START", { 
            tier, 
            model: modelName, 
            input: message,
            provider: agent.currentProvider
        });

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const config = {
            tools: toolsEnabled ? ALL_TOOLS : []
        };

        await tracker.log("LLM_INVOKE_START", { msgCount: messages.length });
        console.log(`[HANDLER_INVOKE] Calling agent.invoke...`);
        const response = await agent.invoke(messages, config);
        console.log(`[HANDLER_SUCCESS] Agent returned response. Content length: ${response.text?.length}`);
        
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
        console.error(`❌ [${tier}_CRASH]:`, err.message);
        await tracker.log("PIPELINE_COLLAPSE", { error: err.message });
        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    } finally {
        await tracker.close();
    }
};
