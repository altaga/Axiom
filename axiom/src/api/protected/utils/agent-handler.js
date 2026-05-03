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

        let currentMessages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const config = {
            tools: toolsEnabled ? ALL_TOOLS : []
        };

        let iteration = 0;
        const maxIterations = 5;
        let finalContent = "";
        let lastReceipt = null;

        while (iteration < maxIterations) {
            iteration++;
            console.log(`[HANDLER_ITERATION_${iteration}] Starting...`);

            // 1. Create Fresh Agent
            const agent = await get0GAgent(tier, modelName, systemPrompt, tracker);
            
            if (iteration === 1) {
                await tracker.log("REQUEST_START", { 
                    tier, model: modelName, input: message, provider: agent.currentProvider 
                });
            }

            // 2. Perform ONE LLM Turn
            const turn = await agent.invoke(currentMessages, config);
            lastReceipt = turn.receipt;
            
            // 3. IMMEDIATELY Kill Agent
            await agent.destroy();
            console.log(`[HANDLER_AGENT_KILLED] Iteration ${iteration} turn complete.`);

            currentMessages.push(turn.message);

            if (turn.toolCalls.length === 0) {
                finalContent = turn.content;
                break;
            }

            // 4. Execute Tools Independently (Agent is now dead)
            console.log(`[HANDLER_TOOLS] Executing ${turn.toolCalls.length} tools...`);
            const toolResults = await Promise.all(turn.toolCalls.map(async (toolCall, index) => {
                const name = toolCall.function.name;
                const args = toolCall.function.arguments;
                
                await new Promise(r => setTimeout(r, index * 200)); // Stagger
                await tracker.log("TOOL_ACTIVATE", { tool: name, input: args });

                try {
                    const tool = ALL_TOOLS.find(t => t.name === name);
                    const result = tool ? await tool.execute(JSON.parse(args)) : `Tool ${name} not found.`;
                    await tracker.log("TOOL_RESULT", { tool: name, output: result });

                    return {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: name,
                        content: result
                    };
                } catch (err) {
                    await tracker.log("TOOL_RESULT", { tool: name, output: `ERROR: ${err.message}` });
                    return { role: "tool", tool_call_id: toolCall.id, name: name, content: `Error: ${err.message}` };
                }
            }));

            currentMessages.push(...toolResults);
            console.log(`[HANDLER_ITERATION_${iteration}_COMPLETE] Ready for re-invocation.`);
        }

        const parsed = parseAgentOutput(finalContent);
        await tracker.log("REQUEST_SUCCESS", { content: parsed.content });

        return c.json({
            status: "SUCCESS",
            message: parsed.content,
            traceId: traceId,
            receipt: lastReceipt
        });

    } catch (err) {
        console.error(`❌ [${tier}_CRASH]:`, err.message);
        await tracker.log("PIPELINE_COLLAPSE", { error: err.message });
        return c.json({ status: "ERROR", error: err.message, traceId }, 500);
    } finally {
        await tracker.close();
    }
};
