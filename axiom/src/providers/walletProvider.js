/**
 * 💳 AXIOM LABS - ETHEREUM WALLET PROVIDER
 * 
 * This provider manages the connection to the user's EVM wallet (e.g., MetaMask).
 * It uses the 'viem' library for blockchain interactions and targets Base Sepolia.
 * 
 * Handles:
 * 1. Account connection and disconnection.
 * 2. Balance fetching (ETH).
 * 3. Session persistence via cookies.
 * 4. Transaction signing and execution.
 * 5. Provider event listeners (Accounts/Chain changes).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  formatUnits,
} from "viem";

import { baseSepolia } from "viem/chains";

// INITIALIZATION: Standard React Context for global wallet state.
const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  // --- CORE STATE ---
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [status, setStatus] = useState("loading"); // loading | connected | disconnected
  const [error, setError] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  // --- VIEM CLIENTS ---
  const [walletClient, setWalletClient] = useState(null);
  const [publicClient, setPublicClient] = useState(null);

  const COOKIE_NAME = "wallet_session";

  /* ---------------- SESSION MANAGEMENT (COOKIES) ---------------- */

  const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 86400000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  /* ---------------- CORE LOGIC ---------------- */

  /**
   * DISCONNECT: Clears the local session and updates status.
   */
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setUsdcBalance("0.00");
    deleteCookie(COOKIE_NAME);
    setStatus("disconnected");
  }, []);

  /**
   * SYNC: Refreshes account balance and persists the session.
   */
  const updateAccountData = useCallback(async (walletAddress, client) => {
    if (!walletAddress || !client) return;

    try {
      // 1. Fetch Native ETH Balance
      const balanceWei = await client.getBalance({
        address: walletAddress,
      });

      // 2. Fetch USDC Balance (Base Sepolia)
      const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      const usdcRaw = await client.readContract({
        address: USDC_ADDRESS,
        abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
        functionName: 'balanceOf',
        args: [walletAddress]
      });

      setAccount(walletAddress);
      setBalance(formatEther(balanceWei)); // Convert Wei to human-readable Ether.
      setUsdcBalance(formatUnits(usdcRaw, 6)); // USDC has 6 decimals.

      setCookie(COOKIE_NAME, walletAddress, 7); // Persist session for 7 days.
      setStatus("connected");
    } catch (err) {
      console.error("Balance fetch error:", err);
      // Fallback: Connect even if balance fetch fails.
      setAccount(walletAddress);
      setStatus("connected");
    }
  }, []);

  /* ---------------- ACTIONS ---------------- */

  /**
   * CONNECT: Triggers the browser wallet (MetaMask) connection flow.
   */
  const connect = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }

    setStatus("loading");

    try {
      // CLIENTS: Setup viem clients for the current chain.
      const wallet = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      // REQUEST: Trigger account selection popup.
      const [address] = await wallet.requestAddresses();

      setWalletClient(wallet);
      setPublicClient(publicClient);

      await updateAccountData(address, publicClient);
      setError(null);
    } catch (err) {
      setError("User rejected connection");
      setStatus("disconnected");
    }
  };

  /**
   * TX HANDLER: Manages the lifecycle of a blockchain transaction.
   */
  const sendTransaction = async (txConfig) => {
    if (!walletClient || !account) throw new Error("Wallet not connected");

    setTxLoading(true);
    setError(null);

    try {
      // EXECUTE: Send and signed the transaction.
      const hash = await walletClient.sendTransaction({
        account,
        ...txConfig,
      });

      // AWAIT: Wait for the on-chain receipt.
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      // SYNC: Update balance after transaction.
      await updateAccountData(account, publicClient);
      return receipt;
    } catch (err) {
      const msg = err.shortMessage || err.message;
      setError(msg);
      throw err;
    } finally {
      setTxLoading(false);
    }
  };

  /* ---------------- LIFECYCLE (RECONNECT & LISTENERS) ---------------- */

  useEffect(() => {
    if (!window.ethereum) {
      setStatus("disconnected");
      return;
    }

    // INITIAL SETUP: Create clients on mount.
    const wallet = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
    });

    setWalletClient(wallet);
    setPublicClient(publicClient);

    const init = async () => {
      const savedAccount = getCookie(COOKIE_NAME);

      if (!savedAccount) {
        setStatus("disconnected");
        return;
      }

      try {
        // AUTO-CONNECT: Attempt to restore session if addresses are authorized.
        const accounts = await wallet.getAddresses();

        if (accounts.length > 0) {
          await updateAccountData(accounts[0], publicClient);
        } else {
          disconnect();
        }
      } catch {
        disconnect();
      }
    };

    init();

    // EVENT: Handle real-time account switching in the wallet extension.
    const handleAccounts = (accounts) => {
      if (accounts.length > 0) {
        updateAccountData(accounts[0], publicClient);
      } else {
        disconnect();
      }
    };

    // EVENT: Handle network switching.
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [updateAccountData, disconnect]);

  /* ---------------- RENDER ---------------- */

  const value = useMemo(
    () => ({
      account,
      balance,
      usdcBalance,
      status,
      error,
      txLoading,
      walletClient,
      publicClient,
      connect,
      disconnect,
      sendTransaction,
    }),
    [account, balance, usdcBalance, status, error, txLoading],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
