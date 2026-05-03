import { ZeroGAgent } from "./ZeroGAgent";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

// 🌌 GLOBAL SINGLETONS: Only 1 instance for the entire worker
let globalBroker = null;

/**
 * 🛠️ GET SHARED BROKER
 */
export async function getSharedBroker() {
    if (globalBroker) return globalBroker;

    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    if (!privateKey) throw new Error("ZERO_G_PRIVATE_KEY not found.");

    console.log(`[0G_REGISTRY] Initializing Global Singleton Broker...`);
    
    const provider = new ethers.JsonRpcProvider("https://evmrpc.0g.ai", {
        name: "0g-mainnet",
        chainId: 16661
    }, { staticNetwork: true });

    const wallet = new ethers.Wallet(privateKey, provider);
    globalBroker = await createZGComputeNetworkBroker(wallet);
    
    return globalBroker;
}

export async function get0GAgent(tier, modelName, systemPrompt, tracker = null) {
    const broker = await getSharedBroker();
    
    // Create a very thin, stateless wrapper for this specific request
    const agent = new ZeroGAgent({
        broker: broker,
        agentName: `Axiom-${tier}`,
        tracker: tracker
    });

    await agent.create(modelName);
    return agent;
}

/**
 * ⚡ PRE-WARM SERVICE REGISTRY
 */
export async function preWarmRegistry() {
    try {
        const broker = await getSharedBroker();
        await ZeroGAgent.preWarm("qwen3.6-plus", broker);
    } catch (err) {
        console.error(`[0G_PREWARM_FAIL]`, err.message);
    }
}

// Trigger pre-warm in background
preWarmRegistry();
