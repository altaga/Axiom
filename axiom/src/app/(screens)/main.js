
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { toast } from "react-native-sonner";
import { SafeAreaView } from "react-native-safe-area-context";

import LogoText from "../../assets/logotxtb.png"; // Horizontal logo variant.
import AIAppChat from "../../components/chat";
import ConnectWallet from "../../components/walletButtonHeader";
import GlobalStyles from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

export default function Main() {
  const { status } = useWallet();
  const router = useRouter();
  const redirectedRef = useRef(false); // Latch to prevent multiple redirect cycles.
  const [clickCount, setClickCount] = useState(0);

  /**
   * logoClick: Tracks logo clicks for the hidden Easter egg.
   */
  const handleLogoPress = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next === 3) {
        toast.success("Axiom Protocol Activated 🚀", {
          description: "Geppetto Experimental Mode: Enabled",
          duration: 4000,
        });
        return 0;
      }
      return next;
    });

    // Auto-reset click count if user stops clicking for 2 seconds.
    setTimeout(() => setClickCount(0), 2000);
  };

  /**
   * AUTH GUARD:
   * Re-directs the user to the 'Connect' screen if they are not logged in.
   * This ensures that only authenticated users can access the chat interface.
   */
  useEffect(() => {
    if (redirectedRef.current) return;
    if (status === "loading") return;

    if (status === "disconnected") {
      redirectedRef.current = true;
      router.replace("/(screens)/connect");
    }
  }, [status, router]);

  return (
    // UI: Safe area wrapper for the main application viewport.
    <SafeAreaView style={GlobalStyles.container}>
      {/* HEADER: Contains branding and the compact wallet connection toggle. */}
      <View style={GlobalStyles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* MENU: Placeholder for future side-navigation functionality. */}
          <Pressable onPress={handleLogoPress}>
            <Image
              source={LogoText}
              accessibilityLabel="Logo Text"
              style={{
                width: 80,
                height: 24,
                resizeMode: "contain",
                tintColor: "#FFFFFF"
              }}
            />
          </Pressable>
        </View>

        <Text style={{
          color: "#9AA0A6",
          fontSize: 7,
          fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
          textTransform: "uppercase",
          textAlign: 'center',
          letterSpacing: 2,
          opacity: 0.8,
        }}>
          x402 Gateway{"\n"}Pay-per-call AI
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* WALLET BUTTON: Header-optimized variant. */}
          <ConnectWallet />
        </View>
      </View>

      {/* CHAT CONTAINER: Housing for the core conversational AI component. */}
      <View style={GlobalStyles.main}>
        <AIAppChat />
      </View>
    </SafeAreaView>
  );
}
