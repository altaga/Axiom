/**
 * 🛰️ AXIOM LABS - HEADER WALLET BUTTON
 * 
 * A compact version of the Wallet Connect button designed for placement in the 
 * App Navigation Header. Prioritizes space-efficiency while maintaining status state.
 */

import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { mainColor, WalletButtonHeaderStyles as styles } from "../core/styles";
import { useWallet } from "../providers/walletProvider";

const ConnectButtonHeader = () => {
  // LIFESTYLE: Access global wallet context for status-driven UI updates.
  const { status, connect, disconnect } = useWallet();

  // UI: Loading state optimized for header density.
  if (status === "loading") {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.buttonText}>Connecting...</Text>
      </TouchableOpacity>
    );
  }

  // UI: Connected state (Simplified Disconnect CTA)
  if (status === "connected") {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disconnectButton]}
        onPress={disconnect}
      >
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    );
  }

  // UI: Disconnected state (Primary Header CTA)
  return (
    <TouchableOpacity style={styles.button} onPress={connect}>
      <Text style={styles.buttonText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
};

export default ConnectButtonHeader;
