import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

/**
 * 🌌 GEPPETTO - LEAN 0G AGENT
 * 
 * This version is optimized for Cloudflare Workers by removing 
 * the heavy LangChain dependency and using direct fetch for inference.
 */
export class ZeroGAgent {
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
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        this.broker = await createZGComputeNetworkBroker(this.wallet);
    }

    async create(modelName, systemPrompt) {
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
        return this;
    }

    bindTools(tools) {
        // Placeholder for lean tool-calling logic
        return this;
    }

    /**
     * DIRECT INFERENCE (No LangChain)
     * Extremely lightweight and fast.
     */
    async invoke(messagesOrInput, config = {}) {
        // Handle both {messages: []} and [{role:...}]
        const messages = messagesOrInput.messages || messagesOrInput;
        
        if (this.tracker) await this.tracker.log("LLM_INVOKE_START", { model: this.currentModel });

        // 🛡️ Get 0G Signature Headers
        const headers = await this.broker.inference.requestProcessor.getHeader(this.currentProvider);

        // 🚀 Direct Fetch to 0G Provider (OpenAI Compatible)
        const response = await fetch(`${this.endpoint}/chat/completions`, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.currentModel,
                messages: messages,
                temperature: 0,
                stream: false
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`0G_INFERENCE_ERROR: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        
        if (this.tracker) await this.tracker.log("LLM_INVOKE_COMPLETE");

        // Simple mock receipt for now to stay lean
        return { 
            text: content, 
            receipt: { status: "processed", cost_0g: 0 } 
        };
    }
}
