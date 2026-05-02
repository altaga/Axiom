import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

/**
 * 🌌 AXIOM - LEAN 0G AGENT
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
        if (this.tracker) await this.tracker.log("0G_INIT_WALLET_START");
        console.log(`[0G_AGENT_INIT] Initializing wallet for ${this.agentName}...`);
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        console.log(`[0G_AGENT_WALLET] Address: ${this.wallet.address}`);
        
        if (this.tracker) await this.tracker.log("0G_INIT_BROKER_START");
        console.log(`[0G_AGENT_BROKER] Creating ZG Compute Broker...`);
        this.broker = await createZGComputeNetworkBroker(this.wallet);
        
        if (this.tracker) await this.tracker.log("AGENT_0G_INIT_COMPLETE");
        console.log(`[0G_AGENT_READY] Broker established.`);
    }

    async create(modelName, systemPrompt) {
        if (this.tracker) await this.tracker.log("0G_CREATE_LIST_SERVICES_START");
        console.log(`[0G_SERVICE_DISCOVERY] Searching for model: ${modelName}`);
        const services = await this.broker.inference.listService();
        
        if (this.tracker) await this.tracker.log("0G_CREATE_LIST_SERVICES_COMPLETE", { count: services.length });
        console.log(`[0G_SERVICE_LIST] Found ${services.length} services:`);
        services.forEach(s => console.log(`  - ${s.model} (Provider: ${s.provider})` || `  - ${s.model}`));

        const service = services.find(s => 
            s.model.toLowerCase() === modelName.toLowerCase() ||
            s.model.toLowerCase().includes(modelName.toLowerCase())
        );

        if (!service) {
            console.error(`[0G_SERVICE_NOT_FOUND] Could not find provider for ${modelName}`);
            if (this.tracker) await this.tracker.log("0G_CREATE_ERROR", { error: "MODEL_NOT_FOUND", model: modelName });
            throw new Error(`Model [${modelName}] not found.`);
        }

        this.currentModel = service.model;
        this.currentProvider = service.provider.toLowerCase();
        this.currentPricing = {
            input: service.inputPrice.toString(),
            output: service.outputPrice.toString()
        };

        if (this.tracker) await this.tracker.log("0G_CREATE_GET_METADATA_START", { provider: this.currentProvider });
        console.log(`[0G_SERVICE_SELECT] Using Provider: ${this.currentProvider} for Model: ${this.currentModel}`);
        
        console.log(`[0G_METADATA_FETCH] Fetching endpoint for provider...`);
        const { endpoint } = await this.broker.inference.getServiceMetadata(service.provider);
        this.endpoint = endpoint;
        
        if (this.tracker) await this.tracker.log("0G_CREATE_GET_HEADERS_START", { endpoint: this.endpoint });
        console.log(`[0G_ENDPOINT_RESOLVED] ${this.endpoint}`);
        
        return this;
    }

    bindTools(tools) {
        // Placeholder for lean tool-calling logic
        return this;
    }

    /**
     * DIRECT INFERENCE (No LangChain)
     * Supports tool calling loop.
     */
    async invoke(messagesOrInput, config = {}) {
        const messages = messagesOrInput.messages || messagesOrInput;
        const tools = config.tools || [];
        
        console.log(`📡 [0G_INFERENCE] Model: ${this.currentModel} | Tools: ${tools.length}`);
        if (this.tracker) await this.tracker.log("LLM_INVOKE_START", { model: this.currentModel, toolCount: tools.length });

        let currentMessages = [...messages];
        let iteration = 0;
        const maxIterations = 5;

        while (iteration < maxIterations) {
            iteration++;

            // 🛡️ Get 0G Signature Headers
            const headers = await this.broker.inference.requestProcessor.getHeader(this.currentProvider);

            const body = {
                model: this.currentModel,
                messages: currentMessages,
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

            if (this.verbose) {
                console.log(`[0G_INFERENCE_REQUEST] Body:`, JSON.stringify(body, null, 2));
            }

            // 🚀 Direct Fetch to 0G Provider
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
                throw new Error(`0G_INFERENCE_ERROR: ${response.status} - ${errBody}`);
            }

            const data = await response.json();
            const responseMessage = data.choices[0]?.message;
            const content = responseMessage?.content || "";
            const toolCalls = responseMessage?.tool_calls || [];

            if (toolCalls.length === 0) {
                if (this.tracker) await this.tracker.log("LLM_INVOKE_COMPLETE");
                return { 
                    text: content, 
                    receipt: { status: "processed", iterations: iteration } 
                };
            }

            // Handle Tool Calls
            currentMessages.push(responseMessage);
            
            for (const toolCall of toolCalls) {
                const args = toolCall.function.arguments;
                console.log(`🔧 [0G_TOOL_CALL] Executing ${toolCall.function.name} with args: ${args}`);
                
                if (this.tracker) {
                    await this.tracker.log("TOOL_ACTIVATE", { 
                        tool: toolCall.function.name, 
                        input: args 
                    });
                }

                const tool = tools.find(t => t.name === toolCall.function.name);
                const result = tool 
                    ? await tool.execute(JSON.parse(args))
                    : `Tool ${toolCall.function.name} not found.`;

                console.log(`✅ [0G_TOOL_RESULT] ${toolCall.function.name} returned: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
                
                if (this.tracker) {
                    await this.tracker.log("TOOL_RESULT", { 
                        tool: toolCall.function.name, 
                        output: result 
                    });
                }

                currentMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: result
                });
            }
            
            // Loop continues to send tool results back to LLM
        }

        throw new Error("Maximum tool calling iterations exceeded.");
    }
}
