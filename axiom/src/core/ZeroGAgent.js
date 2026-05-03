import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

/**
 * 🌌 AXIOM - LEAN 0G AGENT
 * 
 * This version is optimized for Cloudflare Workers by removing 
 * the heavy LangChain dependency and using direct fetch for inference.
 */
// 🛠️ GLOBAL SERVICE CACHE: Skips expensive network discovery for repeat models
export const SERVICE_CACHE = {};

/**
 * 🌌 AXIOM - STATELESS 0G AGENT
 * 
 * This version uses a shared global broker to avoid the massive 
 * overhead of re-initializing wallets and providers on every turn.
 */
export class ZeroGAgent {
    /**
     * ⚡ PRE-WARM SERVICE CACHE
     */
    static async preWarm(modelName, broker) {
        if (SERVICE_CACHE[modelName.toLowerCase()]) return;
        console.log(`[0G_PREWARM] Preloading metadata for ${modelName}...`);
        const agent = new ZeroGAgent({ broker, agentName: "Prewarmer" });
        await agent.create(modelName);
        console.log(`[0G_PREWARM] ${modelName} is cached and ready.`);
    }

    constructor(config) {
        this.broker = config.broker; // Shared Singleton Broker
        this.agentName = config.agentName || "Agent";
        this.tracker = config.tracker || null;
        
        this.currentModel = null;
        this.currentProvider = null;
        this.currentPricing = null;
        this.endpoint = null;
    }

    // No init() needed - Broker is passed in ready-to-go

    async create(modelName) {
        const cacheKey = modelName.toLowerCase();
        
        if (SERVICE_CACHE[cacheKey]) {
            const cached = SERVICE_CACHE[cacheKey];
            this.currentModel = cached.model;
            this.currentProvider = cached.provider;
            this.currentPricing = cached.pricing;
            this.endpoint = cached.endpoint;
            return this;
        }

        const services = await this.broker.inference.listService();
        const service = services.find(s => 
            s.model.toLowerCase() === modelName.toLowerCase() ||
            s.model.toLowerCase().includes(modelName.toLowerCase())
        );

        if (!service) throw new Error(`Model [${modelName}] not found.`);

        this.currentModel = service.model;
        this.currentProvider = service.provider.toLowerCase();
        this.currentPricing = {
            input: service.inputPrice.toString(),
            output: service.outputPrice.toString()
        };

        const { endpoint } = await this.broker.inference.getServiceMetadata(service.provider);
        this.endpoint = endpoint;
        
        SERVICE_CACHE[cacheKey] = {
            model: this.currentModel,
            provider: this.currentProvider,
            pricing: this.currentPricing,
            endpoint: this.endpoint
        };
        
        return this;
    }

    async invoke(messagesOrInput, config = {}) {
        const messages = messagesOrInput.messages || messagesOrInput;
        const tools = config.tools || [];
        if (this.tracker) await this.tracker.log("LLM_INVOKE_START", { model: this.currentModel, toolCount: tools.length });

        const withTimeout = async (promise, timeoutMs, errorMessage) => {
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        try {
            const headers = await withTimeout(
                this.broker.inference.requestProcessor.getHeader(this.currentProvider),
                30000,
                "0G_SIGNATURE_TIMEOUT"
            );

            const body = {
                model: this.currentModel,
                messages: messages,
                temperature: 0,
                stream: false
            };

            if (tools.length > 0) {
                body.tools = tools.map(t => ({
                    type: "function",
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters
                    }
                }));
                body.tool_choice = "auto";
            }

            const response = await fetch(`${this.endpoint}/chat/completions`, {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`0G_API_ERROR: ${response.status}`);

            const data = await response.json();
            const responseMessage = data.choices[0]?.message;
            
            return {
                message: responseMessage,
                content: responseMessage.content || "",
                toolCalls: responseMessage.tool_calls || []
            };

        } catch (err) {
            console.error(`[0G_INVOKE_FATAL]`, err.message);
            throw err;
        }
    }

    async destroy() {
        this.tracker = null;
        this.broker = null; 
    }
}
