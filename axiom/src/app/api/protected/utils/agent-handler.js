import { get0GAgent } from "../../../../core/0g-registry";
import { parseAgentOutput } from "../../../../core/llm";
import { ALL_TOOLS } from "./tools";

/**
 * 🛠️ PROTECTED AGENT HANDLER
 * 
 * Localized logic for protected agent requests.
 * Secured via x402 on the mounting Hub.
 */

export const handleAgentRequest = async (c, tier, modelName, systemPrompt) => {
    const traceId = c.req.header("X-Geppetto-Trace-Id") || `trace-${Date.now()}`;
    const toolsEnabled = c.req.header("X-Tools-Enabled") === "true";
    const body = await c.req.json();
    const message = body.message || body.prompt;
    const history = body.history || [];

    console.log(`\n📥 [x402_RECEIVE] [${tier}] Trace: ${traceId}`);
    console.log(`💬 User said: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`🛠️ Tools Enabled: ${toolsEnabled}`);

    try {
        const agent = await get0GAgent(tier, modelName, systemPrompt);
        
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const config = {
            tools: toolsEnabled ? ALL_TOOLS : []
        };

        console.log(`⚙️ [${tier}_PROCESS] Invoking Model: ${modelName}...`);
        const response = await agent.invoke(messages, config);
        const parsed = parseAgentOutput(response.text);

        console.log(`📤 [${tier}_SAY] Response generated (${response.text.length} chars).`);
        console.log(`💰 Receipt:`, JSON.stringify(response.receipt));

        return c.json({
            status: "SUCCESS",
            message: parsed.content,
            answer: parsed.content,
            traceId: traceId,
            receipt: response.receipt
        });
    } catch (err) {
        console.error(`❌ [${tier}_CRASH]:`, err.message);
        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    }
};
