import "../core/polyfills";
/**
 * 🏗️ AXIOM LABS - ROOT APPLICATION LAYOUT
 * 
 * This is the entry point of the Expo Router application.
 * It handles:
 * 1. Global Font Loading (Inter, Exo2, Bungee).
 * 2. Provider Nesting (Smart Framing -> State Context -> Wallet Session).
 * 3. Navigation Stack Configuration (Hidden headers, smooth transitions).
 * 4. Global UI Overlays (Status Bar and Toast Manager).
 */

import { Bungee_400Regular } from "@expo-google-fonts/bungee";
import { Exo2_400Regular, Exo2_700Bold } from "@expo-google-fonts/exo-2";
import { Inter_400Regular, Inter_700Bold, Inter_900Black } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "react-native-reanimated"; // REQUIRED for smooth UI transition animations.
import { Toaster } from "react-native-sonner";
import { ContextProvider } from "../providers/contextModule";
import SmartProvider from "../providers/smartProvider";
import { WalletProvider } from "../providers/walletProvider";

export default function RootLayout() {
  /**
   * ASYNC FONT LOADING: Ensures premium typography is available before UI rendering.
   */
  useFonts({
    Exo2_400Regular,
    Exo2_700Bold,
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
    Bungee_400Regular,
  });

  return (
    <React.Fragment>
      {/* 🚀 PROVIDER HIERARCHY: WalletProvider (Auth) -> ContextProvider (State) -> SmartProvider (Framing) */}
      <WalletProvider>
        <ContextProvider>
          <SmartProvider>
            {/* NAVIGATION: Defines the screen flow and transition animations. */}
            <Stack
              initialRouteName="(screens)/connect"
              screenOptions={{
                animation: "simple_push",
                headerShown: false, // Standard Axiom aesthetic: Custom headers instead of defaults.
                contentStyle: { backgroundColor: "#0e0e10" }
              }}
            >
              <Stack.Screen name="(screens)/index" />
              <Stack.Screen name="(screens)/main" />
              <Stack.Screen name="(screens)/connect" />
              <Stack.Screen name="(screens)/dashboard" />
            </Stack>
            <StatusBar style="auto" />
            <Toaster position="top-center" richColors />
          </SmartProvider>
        </ContextProvider>
      </WalletProvider>
    </React.Fragment>
  );
}
