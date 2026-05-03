import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useSmartSize } from "../providers/smartProvider";

// x402 Libraries for the client-side payment protocol.
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "react-native-sonner";
import Markdown from "react-native-markdown-display";
import MathRenderer from "./MathRenderer";

import { GeminiStyles, FinanceStyles } from "../core/styles";
import { formatTimestamp } from "../core/utils";
import ContextModule from "../providers/contextModule";
import { useWallet } from "../providers/walletProvider";
import FinanceCard from "./FinanceCard";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Base URL for the API (Empty string implies relative/localhost in Expo dev).
const AI_URL = "";

/**
 * AGENT TIER DEFINITIONS
 * Maps UI labels to backend routes, pricing, and diagnostic IDs.
 */
const TIERS = [
  { label: "Fast — $0.0001", subLabel: "Quick answers", route: "/api/protected/basic", price: "$0.0001", toolPrice: "$0.0003", id: "#101" },
  { label: "Smart — $0.001", subLabel: "Better reasoning & responses", route: "/api/protected/advance", price: "$0.001", toolPrice: "$0.002", id: "#102" },
  { label: "Powerful — $0.01", subLabel: "Deep analysis, code, complex tasks", route: "/api/protected/expert", price: "$0.01", toolPrice: "$0.02", id: "#103" },
];

/**
 * SUGGESTION CHIPS
 * Quick-start prompts displayed in the Hero view.
 */
const SUGGESTIONS = [
  { icon: "image-outline", text: "Create image" },
  { icon: "music-note", text: "Create music" },
  { icon: "video-outline", text: "Create video" },
  { icon: "school-outline", text: "Help me learn" },
  { icon: "sparkles-outline", text: "Boost my day" },
  { icon: "pencil-outline", text: "Write anything" },
];

export default function AIAppChat() {
  const { isDesktop } = useSmartSize();
  const context = useContext(ContextModule);
  const { walletClient, account, status, connect, usdcBalance } = useWallet();

  const listRef = useRef(null);

  // UI STATE
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [tierIndex, setTierIndex] = useState(0);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const toolsEnabled = searchEnabled || weatherEnabled || financeEnabled;
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  // 🛰️ x402 CLIENT CONFIGURATION
  // Wrap standard fetch with the x402 protocol handler.
  const fetchWithPay = useCallback(async (...args) => {
    if (!walletClient || !account) return fetch(...args);

    console.log(`[x402] Initializing protocol client for ${account}`);
    const xClient = new x402Client();
    xClient.register("eip155:84532", new ExactEvmScheme({
      address: account,
      signTypedData: async (typedData) => {
        console.log("[x402] Signing EIP-712 Permit...", typedData);
        return await walletClient.signTypedData({
          account,
          ...typedData
        });
      },
      signMessage: async ({ message }) => {
        console.log("[x402] Signing Message...", message);
        return await walletClient.signMessage({ account, message });
      }
    }, {
      rpcUrl: "https://sepolia.base.org"
    }));

    const wrap = wrapFetchWithPayment(fetch, xClient);

    // Intercept result to log success/failure of the handshake
    try {
      const response = await wrap(...args);
      if (response.status === 402) {
        console.warn("[x402] Challenge received but not handled by wrapper.");
      } else if (response.ok) {
        console.log("[x402] Handshake complete. Status: 200 OK");
      }
      return response;
    } catch (err) {
      console.error("[x402] Protocol Handshake Failed:", err);
      throw err;
    }
  }, [walletClient, account]);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 📐 MATH + MARKDOWN RENDERING ENGINE
   * Splits message text on LaTeX delimiters, routes each segment to the
   * correct renderer: KaTeX (via MathRenderer) for math, react-native-markdown-display
   * for everything else.
   *
   * Supported delimiters:
   *   Inline: \( ... \)
   *   Block:  \[ ... \]
   */
  const renderMessageContent = (content, isUser) => {
    if (!content) return null;

    // Regex captures both inline \(...\) and block \[...\] LaTeX segments.
    const mathRegex = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
    const parts = content.split(mathRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      const isInlineMath = part.startsWith("\\(");
      const isBlockMath = part.startsWith("\\[");

      if (isInlineMath || isBlockMath) {
        // Strip the delimiters and pass clean LaTeX to KaTeX.
        const mathContent = part.replace(/^\\[\(\[]|\\[\)\]]$/g, "").trim();
        return (
          <MathRenderer key={index} math={mathContent} display={isBlockMath} />
        );
      }

      // Non-math segment — render as rich Markdown.
      return (
        <Markdown
          key={index}
          style={isUser ? UserMarkdownStyles : SystemMarkdownStyles}
          rules={MarkdownRules}
        >
          {part}
        </Markdown>
      );
    });
  };

  // The mounted check is moved to the bottom of the hooks list.
  /**
   * DYNAMIC INPUT LOGIC
   * Measures content height to animate the input box between 1 and 4 lines.
   */
  const MIN_CONTENT = 48; // 1 line height
  const MAX_CONTENT = 96; // 4 lines height
  const animatedHeight = useRef(new Animated.Value(MIN_CONTENT)).current;

  const animateToHeight = (toValue) => {
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  const chatGeneral = context.value.chatGeneral || [];
  const showHero = chatGeneral.length === 0;
  /**
   * SESSION SPEND CALCULATION
   * Aggregates all receipts from the current chat context.
   */
  const totalSpend = chatGeneral.reduce((acc, msg) => {
    if (msg.receipt) {
      const val = parseFloat(msg.receipt.replace("$", ""));
      return acc + (isNaN(val) ? 0 : val);
    }
    return acc;
  }, 0);
  const formattedSpend = `$${totalSpend.toFixed(3)}`;

  /**
   * MESSAGE PROCESSING ENGINE
   * Handles the end-to-end flow of sending a message and receiving an AI response.
   */
  const sendMessage = useCallback(async (msgOverride) => {
    const activeMsg = msgOverride || message;
    if (!activeMsg.trim() || loading) return;

    // GUARD: Wallet connection requirement.
    if (!walletClient || !account) {
      toast.warning("Please connect your wallet first");
      return;
    }

    const userMsg = activeMsg;
    const tier = TIERS[tierIndex];

    setMessage("");
    animateToHeight(MIN_CONTENT);
    setLoading(true);

    // TRACE-ID: Generate a unique ID for end-to-end request tracking.
    const traceId = Math.random().toString(36).substring(2, 15);

    // OPTIMISTIC UI: Add the user's message immediately.
    const newUserChat = [
      ...chatGeneral,
      { message: userMsg, type: "user", time: Date.now(), traceId },
    ];
    await context.setValueAsync({ chatGeneral: newUserChat });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // EXECUTION: Direct Fetch (BYPASS X402)
      const history = chatGeneral
        .filter(m => m.type === "user" || m.type === "system")
        .slice(-5)
        .map(m => ({
          role: m.type === "user" ? "user" : "assistant",
          content: m.message
        }));

      const res = await fetchWithPay(`${AI_URL}${tier.route}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Axiom-Trace-Id": traceId,
          "X-Tools-Enabled": toolsEnabled ? "true" : "false",
        },
        body: JSON.stringify({
          message: userMsg,
          history,
          context: { thread_id: account },
        }),
      });

      // 🛡️ [DEBUG: RESPONSE_HANDSHAKE]
      // wrapFetchWithPayment handles the 402 retry loop internally.
      // If result is reached here, it's either the final data or a final error.
      if (!res.ok) {
        // Safe parsing: Only attempt .json() if the status suggests a body might exist.
        // During a cancelled 402 flow, the body is often empty, which triggers SyntaxError.
        let errorData = {};
        if (res.status !== 402) {
          try {
            errorData = await res.json();
          } catch (e) {
            console.warn(`[${account}] Failed to parse error JSON (Empty body).`);
          }
        }
        throw new Error(errorData.error || `Server response error (Status: ${res.status}, ID: ${tier.id})`);
      }

      // Safe body parsing for success
      const data = await res.json().catch(() => ({}));

      // PERSISTENCE: Append the AI response on top of newUserChat (which already has the user's message).
      // DO NOT use context.value.chatGeneral here — it's a stale closure from before the user message was added.
      await context.setValueAsync({
        chatGeneral: [
          ...newUserChat,
          {
            message: data.message?.replace(/^\n+/, "") || "Axiom did not provide a response.",
            type: "system",
            time: Date.now(),
            traceId: data.traceId || traceId,
            receipt: toolsEnabled ? tier.toolPrice : tier.price
          },
        ],
      });

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Chat Error:", err);
      // ERROR HANDLING: Standardize error display with Tier-specific price info.
      const currentPrice = toolsEnabled ? tier.toolPrice : tier.price;
      const errorMessage = err.message.includes("ID:") ? err.message : `Payment required — this request costs ${currentPrice} (ID: ${tier.id})`;

      toast.error(errorMessage);

      context.setValue({
        chatGeneral: [
          ...newUserChat,
          {
            message: errorMessage,
            type: "system",
            time: Date.now(),
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [message, loading, walletClient, account, tierIndex, context, chatGeneral, searchEnabled, weatherEnabled, financeEnabled]);

  // FAUCET LOGIC
  const handleFaucet = useCallback(async () => {
    if (!account || faucetLoading) return;

    setFaucetLoading(true);
    try {
      const response = await fetch("/api/public/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account }),
      });

      const data = await response.json();
      if (response.ok) {
        const hashStr = data.hash ? data.hash.substring(0, 10) : "Success";
        toast.success("USDC Drop Requested!", {
          description: `Hash: ${hashStr}...`,
          action: data.hash ? {
            label: "View Explorer",
            onClick: () => Linking.openURL(`https://sepolia.basescan.org/tx/${data.hash}`),
          } : undefined,
          duration: 6000,
        });
      } else {
        throw new Error(data.error || "Faucet drop failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFaucetLoading(false);
    }
  }, [account, faucetLoading]);

  // HYDRATION FIX: Safely return empty UI before rendering to prevent client/server mismatches.
  // This must be placed AFTER all hooks (useState, useRef, useCallback) to obey the Rules of Hooks.
  if (!mounted) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: isDesktop ? "#0e0e10" : "#131314" }]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* SUB-HEADER: SESSION SPEND / FAUCET ACTION */}
      {status === "connected" && (parseFloat(usdcBalance) > 0 || !isDesktop) && (
        <View style={GeminiStyles.subHeader}>
          {parseFloat(usdcBalance) === 0 ? (
            <>
              <Text style={GeminiStyles.sessionSpendLabel}>Insufficient Funds</Text>
              <Pressable
                style={[GeminiStyles.faucetButtonCohesive, faucetLoading && GeminiStyles.faucetButtonCohesiveDisabled]}
                onPress={handleFaucet}
                disabled={faucetLoading}
              >
                {faucetLoading ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Text style={GeminiStyles.faucetButtonTextCohesive}>Get Testnet USDC</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={GeminiStyles.sessionSpendLabel}>Current Session Spend</Text>
              <Text style={GeminiStyles.sessionSpendAmount}>{formattedSpend} USDC</Text>
            </>
          )}
        </View>
      )}

      {/* TOOLS MENU (Overlay) */}
      {showToolsMenu && (
        <>
          <Pressable
            style={GeminiStyles.modelMenuOverlay}
            onPress={() => setShowToolsMenu(false)}
          />
          <View style={[GeminiStyles.toolsMenuContainer, { paddingVertical: 8 }]}>
            <Text style={[GeminiStyles.modelItemSub, { paddingHorizontal: 16, paddingBottom: 8, color: '#9AA0A6', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }]}>Agent Tools & APIs</Text>

            {/* WEB SEARCH TOOL */}
            <Pressable
              style={[GeminiStyles.modelMenuItem, searchEnabled && GeminiStyles.modelMenuItemActive]}
              onPress={() => setSearchEnabled(prev => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="globe-outline" size={16} color={searchEnabled ? "#6366F1" : "#E3E3E3"} />
                  <Text style={[GeminiStyles.modelItemTitle, searchEnabled && { color: '#6366F1' }]}>Web Search</Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  DuckDuckGo · {searchEnabled ? TIERS[tierIndex].toolPrice : TIERS[tierIndex].price}
                </Text>
              </View>
              <View style={[
                { width: 36, height: 20, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 2 },
                { backgroundColor: searchEnabled ? '#6366F1' : '#3A3A3A' }
              ]}>
                <View style={[
                  { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
                  { transform: [{ translateX: searchEnabled ? 16 : 0 }] }
                ]} />
              </View>
            </Pressable>

            {/* WEATHER TOOL */}
            <Pressable
              style={[GeminiStyles.modelMenuItem, weatherEnabled && GeminiStyles.modelMenuItemActive]}
              onPress={() => setWeatherEnabled(prev => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="sunny-outline" size={16} color={weatherEnabled ? "#6366F1" : "#E3E3E3"} />
                  <Text style={[GeminiStyles.modelItemTitle, weatherEnabled && { color: '#6366F1' }]}>Weather API</Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  Open-Meteo · {weatherEnabled ? TIERS[tierIndex].toolPrice : TIERS[tierIndex].price}
                </Text>
              </View>
              <View style={[
                { width: 36, height: 20, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 2 },
                { backgroundColor: weatherEnabled ? '#6366F1' : '#3A3A3A' }
              ]}>
                <View style={[
                  { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
                  { transform: [{ translateX: weatherEnabled ? 16 : 0 }] }
                ]} />
              </View>
            </Pressable>

            {/* FINANCE TOOL */}
            <Pressable
              style={[GeminiStyles.modelMenuItem, financeEnabled && GeminiStyles.modelMenuItemActive]}
              onPress={() => setFinanceEnabled(prev => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="stats-chart-outline" size={16} color={financeEnabled ? "#6366F1" : "#E3E3E3"} />
                  <Text style={[GeminiStyles.modelItemTitle, financeEnabled && { color: '#6366F1' }]}>Finance API</Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  Real-time Quotes · {financeEnabled ? TIERS[tierIndex].toolPrice : TIERS[tierIndex].price}
                </Text>
              </View>
              <View style={[
                { width: 36, height: 20, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 2 },
                { backgroundColor: financeEnabled ? '#6366F1' : '#3A3A3A' }
              ]}>
                <View style={[
                  { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
                  { transform: [{ translateX: financeEnabled ? 16 : 0 }] }
                ]} />
              </View>
            </Pressable>
          </View>
        </>
      )}

      {/* MODEL SELECTION MENU (Overlay) */}
      {showModelMenu && (
        <>
          <Pressable
            style={GeminiStyles.modelMenuOverlay}
            onPress={() => setShowModelMenu(false)}
          />
          <View style={[GeminiStyles.modelMenuContainer, { paddingVertical: 8 }]}>
            <Text style={[GeminiStyles.modelItemSub, { paddingHorizontal: 16, paddingBottom: 8, color: '#9AA0A6', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }]}>Choose how much to pay</Text>
            {TIERS.map((tier, idx) => (
              <Pressable
                key={idx}
                style={[
                  GeminiStyles.modelMenuItem,
                  tierIndex === idx && GeminiStyles.modelMenuItemActive
                ]}
                onPress={() => {
                  setTierIndex(idx);
                  setShowModelMenu(false);
                }}
              >
                <View>
                  <Text style={GeminiStyles.modelItemTitle}>{tier.label}</Text>
                  <Text style={GeminiStyles.modelItemSub}>{tier.subLabel}</Text>
                </View>
                {tierIndex === idx && (
                  <Ionicons name="checkmark" size={18} color="#6366F1" />
                )}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* CHAT MESSAGES / HERO VIEW */}
      <View style={{ flex: 1, width: "100%" }}>
        {showHero ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={GeminiStyles.heroContainer}>
              <Text style={GeminiStyles.greetingText}>Hi User</Text>
              <Text style={GeminiStyles.promptText}>Where should we start?</Text>
            </View>
            <View style={GeminiStyles.suggestionsList}>
              {SUGGESTIONS.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={GeminiStyles.suggestionChip}
                  onPress={() => sendMessage(item.text)}
                >
                  <Ionicons name={item.icon} size={18} color="#6366F1" style={{ marginRight: 12 }} />
                  <Text style={GeminiStyles.suggestionText}>{item.text}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlashList
            ref={listRef}
            data={chatGeneral}
            extraData={tick}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isUser = item.type === "user";
              return (
                <View style={[styles.messageContainer, isUser ? styles.userAlign : styles.systemAlign]}>
                  {isUser ? (
                    <LinearGradient
                      colors={["#4F46E5", "#6366F1"]}
                      style={[styles.bubble, styles.userBubble]}
                    >
                      {renderMessageContent(item.message, true)}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, styles.systemBubble]}>
                      {item.receipt && (
                        <View style={GeminiStyles.receiptContainer}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={GeminiStyles.receiptText}>
                            Payment successful · <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.receipt}</Text> received · Response Unlocked
                          </Text>
                        </View>
                      )}

                      {(() => {
                        try {
                          if (item.message.startsWith('{') && item.message.includes('finance_quote')) {
                            const data = JSON.parse(item.message);
                            return <FinanceCard data={data} />;
                          }
                        } catch (e) { }
                        return renderMessageContent(item.message, false);
                      })()}
                    </View>
                  )}
                  <Text style={styles.timestamp}>{formatTimestamp(item.time)}</Text>
                </View>
              );
            }}
            estimatedItemSize={100}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listPadding}
          />
        )}
      </View>

      {/* INPUT AREA */}
      <View style={[GeminiStyles.inputBox, { marginHorizontal: isDesktop ? 0 : 8 }]}>
        {status !== "connected" ? (
          <Pressable style={styles.connectButton} onPress={connect}>
            <Text style={styles.connectText}>Connect Wallet to Chat</Text>
          </Pressable>
        ) : (
          <View style={{ position: 'relative' }}>
            {/* HIDDEN MEASURING INPUT: Used to calculate content height for the animation. */}
            <TextInput
              multiline
              maxLength={2000}
              value={message}
              style={[styles.input, { position: "absolute", opacity: 0, width: "100%", zIndex: -1 }]}
              onContentSizeChange={(e) => {
                const rawH = e.nativeEvent.contentSize.height;
                const clamped = Math.min(Math.max(rawH, MIN_CONTENT), MAX_CONTENT);
                animateToHeight(clamped);
              }}
              editable={false}
              pointerEvents="none"
              tabIndex={-1}
            />

            {/* VISIBLE ANIMATED INPUT */}
            <AnimatedTextInput
              placeholder="Send a paid request..."
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={2000}
              value={message}
              showVerticalScrollIndicator={false}
              onChangeText={(text) => setMessage(text)}
              style={[styles.input, { height: animatedHeight }]}
            />

            {/* ACTION BAR (Bottom of Input Box) */}
            <View style={GeminiStyles.inputActionRow}>
              <View style={GeminiStyles.inputLeftActions}>
                <Pressable onPress={() => { setShowToolsMenu(prev => !prev); setShowModelMenu(false); }}>
                  <Ionicons
                    name="options-outline"
                    size={22}
                    color={toolsEnabled ? "#6366F1" : "#E3E3E3"}
                  />
                </Pressable>
              </View>

              <View style={GeminiStyles.inputRightActions}>
                {/* TIER PICKER TRIGGER */}
                <Pressable
                  style={GeminiStyles.modelSelector}
                  onPress={() => { setShowModelMenu(prev => !prev); setShowToolsMenu(false); }}
                >
                  <Text style={GeminiStyles.modelText}>{TIERS[tierIndex].label}</Text>
                  <Ionicons name="chevron-down" size={14} color="#9AA0A6" />
                </Pressable>

                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Pressable
                    onPress={() => sendMessage()}
                    disabled={!message.trim() || loading}
                    style={{ opacity: message.trim() ? 1 : 0.3 }}
                  >
                    <Ionicons name="send" size={24} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * 🎨 EDITORIAL MARKDOWN STYLES
 * Full rich-text style map for react-native-markdown-display.
 * Adheres to the Brutalist/Editorial design system:
 *   - Off-white code blocks, razor-sharp borders, hard shadows.
 *   - Violent typographic hierarchy (large headings vs. small meta).
 *   - Neon accents for bold/links in user bubbles.
 */
const _baseText = {
  color: "#E3E3E3",
  fontSize: 15,
  lineHeight: 24,
  fontFamily: "Inter_400Regular",
};

const UserMarkdownStyles = {
  body: { ..._baseText, color: "#FFFFFF" },
  text: { ..._baseText, color: "#FFFFFF" },
  strong: { fontFamily: "Inter_700Bold", color: "#DFFF00" },      // Neon chartreuse
  em: { fontStyle: "italic", color: "rgba(255,255,255,0.85)" },
  code_inline: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#DFFF00",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  fence: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#DFFF00",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 14,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#DFFF00",
    borderRadius: 0,
  },
};

const SystemMarkdownStyles = {
  body: _baseText,
  text: _baseText,

  // Headings — violent contrast: huge → small
  heading1: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginVertical: 12, lineHeight: 34 },
  heading2: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#E3E3E3", marginVertical: 10, lineHeight: 28 },
  heading3: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#9AA0A6", marginVertical: 8, lineHeight: 24 },

  strong: { fontFamily: "Inter_700Bold", color: "#6366F1" },      // Purple accent
  em: { fontStyle: "italic", color: "rgba(227,227,227,0.85)" },
  link: { color: "#6366F1", textDecorationLine: "underline" },

  // Bullet / ordered lists
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  list_item: { marginBottom: 6, flexDirection: "row", alignItems: "flex-start" },
  bullet_list_icon: { color: "#6366F1", marginRight: 8, marginTop: 5, fontSize: 10 },
  ordered_list_icon: { color: "#6366F1", fontFamily: "Inter_700Bold", marginRight: 8 },

  // Horizontal rule
  hr: {
    borderBottomWidth: 2,
    borderBottomColor: "#DFFF00",
    marginVertical: 16,
  },

  // Blockquote — editorial left-rule
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.85,
  },

  // Inline code — Off-white on dark, razor-sharp
  code_inline: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#DFFF00",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 0,
  },

  // Code block / fence — editorial hard-bordered slab
  fence: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#E3E3E3",
    backgroundColor: "#0D0D0F",
    padding: 16,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
    borderRadius: 0,
    ...Platform.select({ web: { overflowX: "auto" } }),
  },
  code_block: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#E3E3E3",
    backgroundColor: "#0D0D0F",
    padding: 16,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
    borderRadius: 0,
  },
};

/**
 * MARKDOWN RULES OVERRIDE
 * Keeps default rendering for most nodes. Extend this to
 * inject custom components (e.g., syntax-highlighted code).
 */
const MarkdownRules = {};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e10",
    // CROSS-PLATFORM: Hide Scrollbars on Web browsers.
    ...Platform.select({
      web: {
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      },
    }),
  },
  listPadding: { paddingHorizontal: 16, paddingVertical: 20 },
  messageContainer: { marginBottom: 20, maxWidth: "85%" },
  userAlign: { alignSelf: "flex-end", alignItems: "flex-end" },
  systemAlign: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, minWidth: 100 },
  userBubble: { borderBottomRightRadius: 4 },
  systemBubble: { backgroundColor: "#1E1F20", borderBottomLeftRadius: 4, overflow: "hidden" },
  messageText: { fontSize: 16, lineHeight: 24, fontFamily: "Inter_400Regular", color: "white", flexShrink: 1, flexWrap: "wrap" },
  timestamp: { fontSize: 10, color: "#9AA0A6", marginTop: 4, fontFamily: "Inter_400Regular" },
  input: {
    color: "white",
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
    borderWidth: 0,
    outlineStyle: "none",
    minHeight: 24,
    maxHeight: 96,
    ...Platform.select({
      web: {
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        resize: "none",
        overflow: "hidden",
      },
    }),
  },
  connectButton: { paddingVertical: 12, alignItems: "center" },
  connectText: { color: "#6366F1", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});
