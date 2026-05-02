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
     * Supports parallel tool calling with staggered delays and 60s timeouts.
     */
    async invoke(messagesOrInput, config = {}) {
        const messages = messagesOrInput.messages || messagesOrInput;
        const tools = config.tools || [];
        
        console.log(`\n[0G_INVOKE_START] Model: ${this.currentModel} | Tools: ${tools.length}`);
        if (this.tracker) await this.tracker.log("LLM_INVOKE_START", { model: this.currentModel, toolCount: tools.length });

        let currentMessages = [...messages];
        let iteration = 0;
        const maxIterations = 5;
        const API_TIMEOUT = 60000; // 60 seconds

        while (iteration < maxIterations) {
            iteration++;
            console.log(`[0G_ITERATION_${iteration}] Starting...`);

            // 🛡️ Get 0G Signature Headers
            console.log(`[0G_SIGN_STEP] Fetching headers for provider: ${this.currentProvider}`);
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

            console.log(`[0G_FETCH_STEP] Calling 0G Inference API (Timeout: ${API_TIMEOUT}ms)...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

            try {
                const response = await fetch(`${this.endpoint}/chat/completions`, {
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errBody = await response.text();
                    console.error(`[0G_API_ERROR] Status: ${response.status} | Body: ${errBody}`);
                    throw new Error(`0G_INFERENCE_ERROR: ${response.status} - ${errBody}`);
                }

                const data = await response.json();
                const responseMessage = data.choices[0]?.message;
                const content = responseMessage?.content || "";
                const toolCalls = responseMessage?.tool_calls || [];

                console.log(`[0G_RESPONSE_RECEIVED] Content length: ${content.length} | Tool calls: ${toolCalls.length}`);

                if (toolCalls.length === 0) {
                    console.log(`[0G_INVOKE_COMPLETE] Returning final response.`);
                    if (this.tracker) await this.tracker.log("LLM_INVOKE_COMPLETE");
                    return { 
                        text: content, 
                        receipt: { status: "processed", iterations: iteration } 
                    };
                }

                // Handle Tool Calls in PARALLEL with staggered delays
                console.log(`[0G_TOOL_STEP] Parallelizing ${toolCalls.length} tool calls...`);
                currentMessages.push(responseMessage);
                
                const toolResults = await Promise.all(toolCalls.map(async (toolCall, index) => {
                    const name = toolCall.function.name;
                    const args = toolCall.function.arguments;
                    
                    // Stagger activation slightly to avoid sudden bursts (e.g. 200ms apart)
                    const staggerDelay = index * 200;
                    console.log(`[0G_TOOL_QUEUE] ${name} (stagger: ${staggerDelay}ms)`);
                    await new Promise(r => setTimeout(r, staggerDelay));

                    console.log(`🔧 [0G_TOOL_EXEC] Starting ${name} with: ${args.substring(0, 100)}`);
                    
                    if (this.tracker) {
                        await this.tracker.log("TOOL_ACTIVATE", { tool: name, input: args });
                    }

                    try {
                        const tool = tools.find(t => t.name === name);
                        const result = tool 
                            ? await tool.execute(JSON.parse(args))
                            : `Tool ${name} not found.`;

                        console.log(`✅ [0G_TOOL_SUCCESS] ${name} finished.`);
                        
                        if (this.tracker) {
                            await this.tracker.log("TOOL_RESULT", { tool: name, output: result });
                        }

                        return {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            name: name,
                            content: result
                        };
                    } catch (toolErr) {
                        console.error(`❌ [0G_TOOL_FAILED] ${name}:`, toolErr.message);
                        return {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            name: name,
                            content: `Tool error: ${toolErr.message}`
                        };
                    }
                }));

                currentMessages.push(...toolResults);
                console.log(`[0G_ITERATION_${iteration}_END] Tool results added. Re-invoking...`);
                
            } catch (err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    console.error(`[0G_TIMEOUT_EXCEEDED] API call took longer than ${API_TIMEOUT}ms`);
                    throw new Error("0G_INFERENCE_TIMEOUT");
                }
                throw err;
            }
        }

        console.error(`[0G_MAX_ITERATIONS] Loop stopped after ${maxIterations} rounds.`);
        throw new Error("Maximum tool calling iterations exceeded.");
    }
}
