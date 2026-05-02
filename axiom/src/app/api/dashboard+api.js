import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

/**
 * 📊 ADMIN DASHBOARD API (AXIOM EDITION)
 * 
 * This endpoint performs a full scan of the 0G system account:
 * 1. Native A0GI Balance
 * 2. Main Ledger Status (Total/Locked/Available)
 * 3. Detailed Sub-Account breakdown by Model/Provider
 */

export async function GET(req) {
  try {
    const RPC_URL = "https://evmrpc.0g.ai";
    const privateKey = process.env.ZERO_G_PRIVATE_KEY;
    
    if (!privateKey) {
      return Response.json({ error: "ZERO_G_PRIVATE_KEY is missing from environment." }, { status: 500 });
    }

    // 1. Fetch live 0G price from CoinGecko
    let current0GPriceUSD = 0;
    try {
      const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd");
      const priceData = await priceRes.json();
      current0GPriceUSD = priceData["zero-gravity"]?.usd || 0;
    } catch (e) {
      console.warn("COINGECKO_FETCH_FAILED", e.message);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // 2. Native Balance
    const nativeBal = await provider.getBalance(wallet.address);
    const nativeBalance = ethers.formatEther(nativeBal);
    const nativeUSDC = (parseFloat(nativeBalance) * current0GPriceUSD).toFixed(4);
    
    // 3. Initialize Broker
    const broker = await createZGComputeNetworkBroker(wallet);

    // 4. Ledger Info
    const { ledgerInfo, infers } = await broker.ledger.ledger.getLedgerWithDetail();

    // 5. Model & Pricing Mapping
    const services = await broker.inference.listService();
    const providerMeta = {};
    const modelToPrice = {}; // Global fallback for unlisted providers

    services.forEach(s => {
        const iPrice = s.inputPrice ?? s.priceInput ?? s.price?.input ?? 0n;
        const oPrice = s.outputPrice ?? s.priceOutput ?? s.price?.output ?? 0n;
        
        const pAddr = s.provider.toLowerCase();
        
        // If we don't have a meta for this provider, or if the current one has no pricing, update it
        if (!providerMeta[pAddr] || (providerMeta[pAddr].priceInput === 0n && iPrice > 0n)) {
            providerMeta[pAddr] = {
              model: s.model,
              priceInput: iPrice,
              priceOutput: oPrice
            };
        }

        // Cache the price for the model globally
        if (iPrice > 0n) {
            modelToPrice[s.model.toLowerCase()] = {
                priceInput: iPrice,
                priceOutput: oPrice
            };
        }
    });

    // 6. Build Sub-Accounts with Token Ranges, USDC & Tiers
    let subAccounts = infers.map(([providerAddr, balanceWei, pendingRefundWei]) => {
      const pAddr = providerAddr.toLowerCase();
      let meta = providerMeta[pAddr];
      const balance = ethers.formatEther(balanceWei);
      const modelName = meta?.model || "Unknown Model";

      // Filter out GLM models as requested
      if (modelName.toLowerCase().includes('glm')) return null;

      // Tier Cross-Reference Logic (Axiom Standard)
      let tier = "SYSTEM";
      let sortOrder = 99;
      const lowerModel = modelName.toLowerCase();
      
      if (lowerModel.includes('gpt')) {
        tier = "BASIC";
        sortOrder = 1;
      } else if (lowerModel.includes('qwen')) {
        tier = "ADVANCED";
        sortOrder = 2;
      } else if (lowerModel.includes('deepseek')) {
        tier = "EXPERT";
        sortOrder = 3;
      }

      // Robust price extraction (handle BigInt vs Number safely)
      const rawPriceIn = meta?.priceInput ? BigInt(meta.priceInput.toString()) : 0n;
      const rawPriceOut = meta?.priceOutput ? BigInt(meta.priceOutput.toString()) : 0n;

      let tokensIn = "0";
      let tokensOut = "0";

      if (rawPriceIn > 0n) {
        tokensIn = (parseFloat(balance) / parseFloat(ethers.formatEther(rawPriceIn))).toFixed(0);
      }
      if (rawPriceOut > 0n) {
        tokensOut = (parseFloat(balance) / parseFloat(ethers.formatEther(rawPriceOut))).toFixed(0);
      }

      return {
        provider: providerAddr,
        model: modelName,
        tier: tier,
        sortOrder: sortOrder,
        balance: balance,
        balanceUSDC: (parseFloat(balance) * current0GPriceUSD).toFixed(6),
        pendingRefund: ethers.formatEther(pendingRefundWei),
        active: balanceWei > 0n,
        pricing: {
          input: rawPriceIn > 0n ? ethers.formatEther(rawPriceIn) : "0",
          output: rawPriceOut > 0n ? ethers.formatEther(rawPriceOut) : "0"
        },
        tokenRange: {
          input: tokensIn,
          output: tokensOut
        }
      };
    }).filter(acc => acc !== null);

    // 7. Sort by Tier (BASIC -> ADVANCED -> EXPERT)
    subAccounts.sort((a, b) => a.sortOrder - b.sortOrder);

    return Response.json({
      success: true,
      address: wallet.address,
      timestamp: Date.now(),
      marketPrice: current0GPriceUSD,
      nativeBalance: nativeBalance,
      nativeUSDC: nativeUSDC,
      ledger: {
        total: ethers.formatEther(ledgerInfo[0]),
        totalUSDC: (parseFloat(ethers.formatEther(ledgerInfo[0])) * current0GPriceUSD).toFixed(2),
        locked: ethers.formatEther(ledgerInfo[1]),
        lockedUSDC: (parseFloat(ethers.formatEther(ledgerInfo[1])) * current0GPriceUSD).toFixed(2),
        available: ethers.formatEther(ledgerInfo[2]),
        availableUSDC: (parseFloat(ethers.formatEther(ledgerInfo[2])) * current0GPriceUSD).toFixed(2)
      },
      subAccounts
    });

  } catch (err) {
    console.error("[DASHBOARD_API_ERROR]", err);
    return Response.json({ 
      success: false, 
      error: err.message,
      stack: process.env.VERBOSE_DEBUG === 'true' ? err.stack : undefined
    }, { status: 500 });
  }
}
