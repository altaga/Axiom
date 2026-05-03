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

export class ZeroGAgent {
    /**
     * ⚡ PRE-WARM SERVICE CACHE
     * Populates the global cache in the background.
     */
    static async preWarm(modelName, config) {
        if (SERVICE_CACHE[modelName.toLowerCase()]) return;
        console.log(`[0G_PREWARM] Preloading metadata for ${modelName}...`);
        const agent = new ZeroGAgent(config);
        await agent.init();
        await agent.create(modelName, "");
        await agent.destroy();
        console.log(`[0G_PREWARM] ${modelName} is cached and ready.`);
    }

    constructor(config) {
        this.rpcUrl = config.rpcUrl || "https://evmrpc.0g.ai";
        this.privateKey = config.privateKey;
        this.verbose = config.verbose || false;
        this.agentName = config.agentName || "Agent";
        this.tracker = config.tracker || null;
        
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl, {
            name: "0g-mainnet",
            chainId: 16661
        }, { staticNetwork: true });
        
        this.currentModel = null;
        this.currentProvider = null;
        this.currentPricing = null;
        this.endpoint = null;
    }

    async init() {
        if (this.tracker) await this.tracker.log("0G_INIT_WALLET_START");
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        
        if (this.tracker) await this.tracker.log("0G_INIT_BROKER_START");
        this.broker = await createZGComputeNetworkBroker(this.wallet);
        
        if (this.tracker) await this.tracker.log("AGENT_0G_INIT_COMPLETE");
    }

    async create(modelName, systemPrompt) {
        const cacheKey = modelName.toLowerCase();
        
        if (SERVICE_CACHE[cacheKey]) {
            console.log(`[0G_CACHE_HIT] Re-using discovery for ${modelName}`);
            const cached = SERVICE_CACHE[cacheKey];
            this.currentModel = cached.model;
            this.currentProvider = cached.provider;
            this.currentPricing = cached.pricing;
            this.endpoint = cached.endpoint;
            return this;
        }

        if (this.tracker) await this.tracker.log("0G_CREATE_LIST_SERVICES_START");
        console.log(`[0G_SERVICE_DISCOVERY] Searching for model: ${modelName}`);
        const services = await this.broker.inference.listService();
        
        const service = services.find(s => 
            s.model.toLowerCase() === modelName.toLowerCase() ||
            s.model.toLowerCase().includes(modelName.toLowerCase())
        );

        if (!service) {
            if (this.tracker) await this.tracker.log("0G_CREATE_ERROR", { error: "MODEL_NOT_FOUND", model: modelName });
            throw new Error(`Model [${modelName}] not found.`);
        }

        this.currentModel = service.model;
        this.currentProvider = service.provider.toLowerCase();
        this.currentPricing = {
            input: service.inputPrice.toString(),
            output: service.outputPrice.toString()
        };

        console.log(`[0G_METADATA_FETCH] Fetching endpoint for provider...`);
        const { endpoint } = await this.broker.inference.getServiceMetadata(service.provider);
        this.endpoint = endpoint;
        
        // 💾 Save to Global Cache
        SERVICE_CACHE[cacheKey] = {
            model: this.currentModel,
            provider: this.currentProvider,
            pricing: this.currentPricing,
            endpoint: this.endpoint
        };
        
        return this;
    }

    bindTools(tools) {
        // Placeholder for lean tool-calling logic
        return this;
    }

    /**
     * DIRECT INFERENCE (No LangChain)
     * Supports parallel tool calling with staggered delays and 60s GLOBAL timeout.
     */
    /**
     * SINGLE TURN INFERENCE
     * Returns content and toolCalls. Lifecycle is managed by the handler.
     */
    async invoke(messagesOrInput, config = {}) {
        const messages = messagesOrInput.messages || messagesOrInput;
        const tools = config.tools || [];
        
        console.log(`\n[0G_INVOKE_START] Model: ${this.currentModel} | Tools: ${tools.length}`);
        if (this.tracker) await this.tracker.log("LLM_INVOKE_START", { model: this.currentModel, toolCount: tools.length });

        const API_TIMEOUT = 60000;
        const withTimeout = async (promise, timeoutMs, errorMessage) => {
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        try {
            // 🛡️ Get 0G Signature Headers (30s timeout)
            console.log(`[0G_SIGN_STEP] Fetching headers for provider: ${this.currentProvider}`);
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

            console.log(`[0G_FETCH_STEP] Calling 0G Inference API...`);
            const response = await fetch(`${this.endpoint}/chat/completions`, {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errBody = await response.text();
                console.error(`[0G_API_ERROR] Status: ${response.status} | Body: ${errBody}`);
                throw new Error(`0G_INFERENCE_ERROR: ${response.status} - ${errBody}`);
            }

            const data = await response.json();
            const responseMessage = data.choices[0]?.message;
            
            console.log(`[0G_RESPONSE_RECEIVED] Content length: ${responseMessage?.content?.length || 0} | Tool calls: ${responseMessage?.tool_calls?.length || 0}`);
            
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
    /**
     * RESOURCE CLEANUP
     * Ensures all references are cleared to allow garbage collection.
     */
    async destroy() {
        console.log(`[0G_AGENT_DESTROY] Cleaning up resources for ${this.agentName}...`);
        this.broker = null;
        this.wallet = null;
        this.provider = null;
        this.tracker = null;
    }
}
