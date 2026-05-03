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

    // 🛠️ FRESH RESET MODE: Caching disabled to prevent state/resource leakage
    console.log(`[0G_REGISTRY] Creating FRESH agent for ${key}...`);
    if (tracker) await tracker.log("AGENT_0G_INIT_START", { tier });

    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    if (!privateKey) throw new Error(`ZERO_G_PRIVATE_KEY not found.`);

    const agent = new ZeroGAgent({
        privateKey: privateKey,
        agentName: `Axiom-${tier}`,
        verbose: process.env.VERBOSE_DEBUG === 'true',
        tracker: tracker
    });

    await agent.init();
    if (tracker) await tracker.log("AGENT_0G_CREATE_START", { modelName });
    await agent.create(modelName, systemPrompt);

    // registry[key] = agent; // Disabled for fresh reset mode
    console.log(`✅ [0G_REGISTRY] Agent [${tier}] is ONLINE.`);
    if (tracker) await tracker.log("AGENT_READY", { tier });

    return agent;
}

/**
 * ⚡ PRE-WARM SERVICE REGISTRY
 * Populates caches in the background.
 */
export async function preWarmRegistry() {
    const models = ["qwen3.6-plus"];
    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    if (!privateKey) return;

    for (const model of models) {
        ZeroGAgent.preWarm(model, {
            privateKey: privateKey,
            agentName: "Axiom-Prewarmer"
        }).catch(err => console.error(`[0G_PREWARM_FAIL] ${model}:`, err.message));
    }
}

// Trigger pre-warm in background
preWarmRegistry();
