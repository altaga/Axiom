import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ChatOpenAI } from "@langchain/openai";
import { ethers } from "ethers";

export class ZeroGAgent {
    constructor(config) {
        this.rpcUrl = config.rpcUrl || "https://evmrpc.0g.ai";
        this.privateKey = config.privateKey;
        this.verbose = config.verbose || false;
        this.agentName = config.agentName || "Agent";
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    }

    async init() {
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        this.userAddress = await this.wallet.getAddress();
        this.broker = await createZGComputeNetworkBroker(this.wallet);
        this.usdPrice = await this.#get0GPriceUSD();
        
        if (this.verbose) {
            console.log(`\n   🔗 [${this.agentName}] Initialized on: ${this.rpcUrl}`);
            console.log(`   🏦 [${this.agentName}] Wallet: ${this.userAddress}\n`);
        }
    }

    async listAvailableModels() {
        if (!this.broker) await this.init();
        const services = await this.broker.inference.listService();
        return services.map(s => ({
            id: s.model,
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: s.provider
        }));
    }

    async create(modelName) {
        const services = await this.broker.inference.listService();
        const trimmedModel = modelName.trim().toLowerCase();

        const service = services.find(s => {
            const m = s.model.toLowerCase();
            return m === trimmedModel || m.includes(trimmedModel) || trimmedModel.includes(m);
        });

        if (!service) {
            const available = services.map(s => s.model).join(", ");
            throw new Error(`Model [${modelName}] not found. Available: ${available}`);
        }

        this.currentModel = service.model;
        this.currentProvider = service.provider.toLowerCase();
        this.currentPricing = {
            input: service.inputPrice.toString(),
            output: service.outputPrice.toString()
        };

        const { endpoint } = await this.broker.inference.getServiceMetadata(service.provider);
        const headers = await this.broker.inference.getRequestHeaders(service.provider);

        this.tracker = { prompt_tokens: 0, completion_tokens: 0 };
        const usageCallback = {
            handleLLMEnd: (output) => {
                const std = output.llmOutput?.tokenUsage || output.llmOutput?.estimatedTokenUsage;
                if (std) {
                    this.tracker.prompt_tokens += std.promptTokens || 0;
                    this.tracker.completion_tokens += std.completionTokens || 0;
                }
            }
        };

        this.llmModel = new ChatOpenAI({
            apiKey: "not-needed",
            model: service.model,
            configuration: { baseURL: endpoint, defaultHeaders: headers },
            callbacks: [usageCallback],
            temperature: 0,
            streaming: true 
        });

        return this;
    }

    bindTools(toolsArray) {
        if (this.llmModel && toolsArray && toolsArray.length > 0) {
            this.llmModel = this.llmModel.bindTools(toolsArray);
        }
        return this;
    }

    async invoke(messages) {
        const response = await this.llmModel.invoke(messages);
        await this.#processOnChainAccounting(this.tracker);
        return response;
    }

    async stream(messages) {
        return await this.llmModel.stream(messages);
    }

    async finalizeAccounting() {
        return await this.#processOnChainAccounting(this.tracker);
    }

    async #processOnChainAccounting(usage) {
        const inputWei = (BigInt(usage.prompt_tokens) * BigInt(this.currentPricing.input)) / 1000000n;
        const outputWei = (BigInt(usage.completion_tokens) * BigInt(this.currentPricing.output)) / 1000000n;
        const totalWei = inputWei + outputWei;
        const cost0G = parseFloat(ethers.formatEther(totalWei));
        const costUSD = cost0G * this.usdPrice;

        const { infers } = await this.broker.ledger.ledger.getLedgerWithDetail();
        const subAccount = infers.find(([addr]) => addr.toLowerCase() === this.currentProvider.toLowerCase());
        const onChainBalance = subAccount ? parseFloat(ethers.formatEther(subAccount[1])) : 0;

        if (this.verbose) {
            console.log(`   📊 [${this.agentName}] Usage: ${usage.prompt_tokens + usage.completion_tokens} tokens`);
            console.log(`   💸 [${this.agentName}] Cost: -${cost0G.toExponential(4)} $0G (~$${costUSD.toFixed(6)} USD)`);
            console.log(`   💳 [${this.agentName}] Remaining: ${onChainBalance.toFixed(4)} $0G\n`);
        }

        return { cost_0g: cost0G, on_chain_balance: onChainBalance, usage: usage };
    }

    async #get0GPriceUSD() {
        try {
            const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd");
            const data = await res.json();
            return data["zero-gravity"]?.usd || 0.125;
        } catch { return 0.125; }
    }
}