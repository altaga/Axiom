/**
 * 👛 AXIOM LABS - STANDALONE WALLET CONNECT BUTTON
 * 
 * A reusable UI component that manages the connection state to the user's EVM wallet.
 * Integrates with the WalletProvider to handle connecting, loading, and disconnecting states.
 */

import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { mainColor, WalletButtonStyles as styles } from "../core/styles";
import { useWallet } from "../providers/walletProvider";

const ConnectButton = () => {
  // LIFESTYLE: Extract connection state and actions from the global wallet context.
  const { status, connect, disconnect } = useWallet();

  // LOCAL STATE: Manage transition loading states that strictly belong to the button UI.
  const [localLoading, setLocalLoading] = useState(false);
  const [localDisconnecting, setLocalDisconnecting] = useState(false);

  /**
   * INITIATE CONNECTION
   * Calls the walletProvider's connect method and manages local loading feedback.
   */
  const handleConnect = async () => {
    if (localLoading || status === "loading") return;

    try {
      setLocalLoading(true);
      await connect();
    } finally {
      setLocalLoading(false);
    }
  };

  /**
   * INITIATE DISCONNECTION
   * Calls the walletProvider's disconnect method.
   */
  const handleDisconnect = async () => {
    if (localDisconnecting) return;

    try {
      setLocalDisconnecting(true);
      await disconnect();
    } finally {
      setLocalDisconnecting(false);
    }
  };

  // UI: Connecting state (either global or local trigger)
  if (status === "loading" || localLoading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.buttonText}>Connecting...</Text>
      </TouchableOpacity>
    );
  }

  // UI: Disconnecting state
  if (localDisconnecting) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disconnectingButton]}
        disabled
      >
        <ActivityIndicator size="small" color="#EF4444" />
        <Text style={styles.disconnectingButtonText}>Disconnecting...</Text>
      </TouchableOpacity>
    );
  }

  // UI: Connected state (Show disconnect option)
  if (status === "connected") {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disconnectButton]}
        onPress={handleDisconnect}
      >
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    );
  }

  // UI: Disconnected state (Default Connect CTA)
  return (
    <TouchableOpacity style={styles.button} onPress={handleConnect}>
      <Text style={styles.buttonText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
};

export default ConnectButton;
