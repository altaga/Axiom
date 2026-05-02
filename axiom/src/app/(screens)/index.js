/**
 * 🚀 AXIOM LABS - SPLASH / ROUTE SELECTOR
 * 
 * This is the landing screen represented by the root index.
 * It serves two purposes:
 * 1. A visual "Loading" splash screen with the Axiom branding.
 * 2. An intelligent router that directs the user to either 'Connect' or 'Main' 
 *    based on their current wallet session status.
 */

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";

import logo from "../../assets/logo.png"; // Core branding asset.
import GlobalStyles from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

export default function SplashLoading() {
  const { status } = useWallet();
  const router = useRouter();

  /**
   * ROUTING LOGIC:
   * Waits for the wallet connection status to stabilize before redirecting.
   */
  useEffect(() => {
    if (status === "loading") return; // Latch: Do nothing while provider is initializing.

    // REDIRECT: To the main chat dashboard if a session already exists.
    if (status === "connected") {
      router.replace("/(screens)/main");
      return;
    }

    // REDIRECT: To the wallet connection landing page if no session is detected.
    if (status === "disconnected") {
      router.replace("/(screens)/connect");
    }
  }, [status, router]);

  return (
    // UI: A premium, centered-logo splash view with a subtle glow effect.
    <View style={[GlobalStyles.container, { backgroundColor: "#131314" }]}>
      <View style={{
        shadowColor: "#6366F1", // Indigo Glow
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Image
          resizeMode="contain"
          source={logo}
          accessibilityLabel="Main Logo"
          style={{
            width: 120,
            height: 120,
          }}
        />
      </View>
    </View>
  );
}
