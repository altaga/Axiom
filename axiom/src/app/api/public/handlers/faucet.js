import { Hono } from "hono";
import { 
  createPublicClient, 
  createWalletClient,
  http, 
  parseUnits,
  hexToSignature,
  keccak256,
  toHex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

/**
 * ⛽ AXIOM - USDC FAUCET SPOKE (Public)
 * 
 * Transfers 0.1 USDC on Base Sepolia.
 * Mounted at: /api/public/faucet
 */

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;
const FAUCET_AMOUNT = "0.1";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;

const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: baseSepolia.id,
  verifyingContract: USDC_ADDRESS,
};

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
];

const faucetApp = new Hono();

faucetApp.post("/", async (c) => {
  const traceId = c.req.header("X-Geppetto-Trace-Id") || Math.random().toString(36).substring(7);

  try {
    const { address, mode = "standard" } = await c.req.json();
    
    if (!address || !address.startsWith("0x")) {
      return c.json({ error: "Invalid wallet address.", traceId }, 400);
    }

    if (!FAUCET_PRIVATE_KEY) {
      return c.json({ error: "Faucet private key not configured.", traceId }, 500);
    }

    const account = privateKeyToAccount(FAUCET_PRIVATE_KEY);
    const amountBigInt = parseUnits(FAUCET_AMOUNT, USDC_DECIMALS);
    
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

    // 1. Execute Standard USDC Transfer
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [address, amountBigInt],
    });

    return c.json({
      success: true,
      message: `${FAUCET_AMOUNT} USDC transferred!`,
      hash,
      recipient: address,
      traceId,
    });

  } catch (err) {
    return c.json({ error: `Faucet failed: ${err.message}`, traceId }, 500);
  }
});

export default faucetApp;
