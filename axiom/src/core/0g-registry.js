import { ZeroGAgent } from "./ZeroGAgent";

/**
 * 🌌 0G AGENT REGISTRY (Stable Simple Version)
 * 
 * Simple global cache for initialized agents.
 */
if (!global.__0g_registry) {
    global.__0g_registry = {};
}
const registry = global.__0g_registry;

export async function get0GAgent(tier, modelName, systemPrompt, tracker = null) {
    const key = `${tier.toLowerCase()}-${modelName.toLowerCase()}`;

    if (registry[key]) {
        if (tracker) await tracker.log("AGENT_0G_CACHE_HIT");
        return registry[key];
    }

    if (tracker) await tracker.log("AGENT_0G_INIT_START", { tier });

    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    if (!privateKey) throw new Error(`ZERO_G_PRIVATE_KEY not found.`);

    const agent = new ZeroGAgent({
        privateKey: privateKey,
        agentName: `Geppetto-${tier}`,
        verbose: process.env.VERBOSE_DEBUG === 'true',
        tracker: tracker
    });

    await agent.init();
    if (tracker) await tracker.log("AGENT_0G_CREATE_START", { modelName });
    await agent.create(modelName, systemPrompt);

    registry[key] = agent;
    console.log(`✅ [0G_REGISTRY] Agent [${tier}] is ONLINE.`);
    if (tracker) await tracker.log("AGENT_READY", { tier });

    return agent;
}

/**
 * Basic Pre-warm (Legacy support, but simplified)
 */
export function preWarmAgent(tier, modelName, systemPrompt, tracker = null) {
    // No background logic, just call get0GAgent if you really want to wait for it.
    get0GAgent(tier, modelName, systemPrompt, tracker).catch(() => { });
}
