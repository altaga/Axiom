import {
  Dimensions,
  PixelRatio,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";

const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.7668;
  }
  const scale = Math.min(width / 375, height / 667); // Based on a standard screen size
  return PixelRatio.roundToNearestPixel(size * scale);
};

export const iconSize = normalizeFontSize(16);
export const screenHeight = Dimensions.get("screen").height;
export const windowHeight = Dimensions.get("window").height;
export const backgroundColor = "#0e0e10";
export const mainColor = "#6366F1";
export const header = 64;
export const footer = 0;

export const ratio =
  Dimensions.get("window").height / Dimensions.get("window").width;
export const StatusBarHeight = StatusBar.currentHeight;
export const NavigatorBarHeight = screenHeight - windowHeight;

// Global Styles
const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor,
    width: "100%",
  },
  header: {
    height: header,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor,
    paddingHorizontal: 12, // Reduced for mobile focus
  },
  main: {
    flex: 1,
    backgroundColor,
    width: "100%",
  },
  headerItem: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

// Gemini UI Components (Modern Premium)
export const GeminiStyles = StyleSheet.create({
  // Greeting Hero
  heroContainer: {
    padding: 24,
    marginTop: 60,
  },
  greetingText: {
    fontSize: 24,
    color: "#E3E3E3",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  promptText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    lineHeight: 48,
    marginBottom: 32,
  },

  // Suggestion Chips
  suggestionsList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: "#1E1F20",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  suggestionText: {
    color: "#E3E3E3",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  // Input Container
  inputBox: {
    backgroundColor: "#1E1F20",
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputPlaceholderText: {
    color: "#9AA0A6",
    fontSize: 16,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  inputActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginTop: 6,
  },
  inputLeftActions: {
    flexDirection: "row",
    gap: 16,
  },
  inputRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modelText: {
    color: "#9AA0A6",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  // Header Elements
  proBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  proText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3C4043",
  },

  // Premium Model Menu
  modelMenuContainer: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 250,
    backgroundColor: "#2E2F31",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 1000,
    // Shadow for elevation
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
    }),
  },
  toolsMenuContainer: {
    position: "absolute",
    bottom: 80,
    left: 16,
    width: 250,
    backgroundColor: "#2E2F31",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
    }),
  },
  modelMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modelMenuItemActive: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  modelItemTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  modelItemSub: {
    color: "#9AA0A6",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  modelMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 999,
  },

  // Receipt Styles
  receiptContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  receiptText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },

  // Subheader: Session Spend (Fixed Height Below Header)
  subHeader: {
    height: 48,
    backgroundColor: "#131314",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, // Reduced for mobile
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sessionSpendLabel: {
    color: "#9AA0A6",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionSpendAmount: {
    color: "#ffffffff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  // Cohesive Faucet Integration
  faucetButtonCohesive: {
    backgroundColor: "rgba(245, 158, 11, 0.1)", // Subtle Amber tint
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderRadius: 20, // Match header buttons
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  faucetButtonTextCohesive: {
    color: "#F59E0B", // Amber
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  faucetButtonCohesiveDisabled: {
    opacity: 0.5,
  },
});

// Wallet Button Styles (Core)
export const WalletButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: mainColor,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loadingButton: {
    backgroundColor: mainColor,
    opacity: 0.8,
  },
  disconnectButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  disconnectingButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_700Bold",
  },
  disconnectButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_700Bold",
  },
  disconnectingButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_700Bold",
  },
});

// Wallet Button Expanded Styles
export const WalletButtonExpandedStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#1E1F20",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  button: { ...WalletButtonStyles.button },
  loadingButton: { ...WalletButtonStyles.loadingButton },
  disconnectButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { ...WalletButtonStyles.buttonText },
  disconnectButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  connectedContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#1E1F20",
    borderRadius: 24,
    minWidth: 280,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  accountAddress: {
    color: mainColor,
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
});

// Wallet Button Header Styles
export const WalletButtonHeaderStyles = StyleSheet.create({
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
  },
  loadingButton: { opacity: 0.6 },
  disconnectButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_700Bold",
  },
  disconnectButtonText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_700Bold",
  },
  faucetButtonDisabled: {
    backgroundColor: "rgba(223, 255, 0, 0.3)",
    borderColor: "rgba(0, 0, 0, 0.3)",
    opacity: 0.7,
    // Remove shadow for disabled state
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      web: { boxShadow: "none" },
    }),
  },
});


// Finance Components (Editorial/Brutal style)
export const FinanceStyles = StyleSheet.create({
  card: {
    backgroundColor: "#F9F9F6", // Off-white
    borderWidth: 2,
    borderColor: "#000000",
    padding: 20,
    marginVertical: 12,
    alignSelf: "stretch",
    borderRadius: 0, // Razor sharp
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: { elevation: 4 },
      web: { boxShadow: "4px 4px 0px #000000" },
    }),
  },
  ticker: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#000000",
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    fontSize: 42,
    fontFamily: "Inter_900Black",
    color: "#000000",
    letterSpacing: -1,
  },
  change: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#DFFF00", // Neon Chartreuse
    color: "#000000",
    fontWeight: "bold",
  },
  metaContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    color: "#666666",
    textTransform: "uppercase",
    fontFamily: "Inter_400Regular",
  },
  metaValue: {
    fontSize: 12,
    color: "#000000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  }
});

export default GlobalStyles;
