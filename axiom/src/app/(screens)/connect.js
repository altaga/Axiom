/**
 * 🔒 GEPPETTO LABS - AUTHENTICATION / CONNECT SCREEN
 * 
 * This is the gateway screen for unauthenticated users.
 * It provides the main CTA for wallet connection and displays 
 * high-level branding and technology information.
 */

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import ConnectWallet from "../../components/walletButton";
import GlobalStyles from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

export default function Connect() {
  const { status } = useWallet();
  const router = useRouter();

  /**
   * AUTH GUARD:
   * Automatically redirects to the 'Main' chat dashboard if the wallet 
   * becomes connected (either via manual button press or auto-reconnect).
   */
  useEffect(() => {
    if (status === "connected") {
      router.replace("/(screens)/main");
    }
  }, [status, router]);

  return (
    // UI: Centered login card on a deep matte-black background.
    <View style={[GlobalStyles.container, { backgroundColor: "#131314", alignItems: "center", justifyContent: "center" }]}>
      <View style={styles.card}>
        {/* HEADER SECTION: Branding and Product Identity */}
        <View style={styles.headerContainer}>
          <Text style={styles.brandName}>Axiom</Text>
          <Text style={styles.headline}>Pay-per-call AI & APIs</Text>
          <Text style={styles.subheadline}>
            No API keys. No subscriptions. Just pay and call.
          </Text>
        </View>

        {/* ACTION SECTION: The Primary Wallet Connect CTA */}
        <View style={styles.actionContainer}>
          <ConnectWallet />
        </View>

        {/* FOOTER SECTION: Protocol and technology badges */}
        <View style={styles.footerContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>POWERED BY X402 AND 0G</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#1E1F20", // Lighter grey for card depth.
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    padding: 32,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  brandName: {
    color: "#6366F1", // Indigo Accent
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subheadline: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  actionContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  footerContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
