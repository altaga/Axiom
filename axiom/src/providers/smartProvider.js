import frame from "../assets/frame.png";
import { Image } from "expo-image";
import { useRouter, useSegments } from "expo-router";
import { Ionicons, Feather } from '@expo/vector-icons';
import { useWallet } from "./walletProvider";
import ContextModule from "./contextModule";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Dimensions, PixelRatio, Platform, View, Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

// 1. Create the Context
const SmartSizeContext = createContext({
  width: 0,
  height: 0,
  scale: 1,
  normalize: (size) => size,
});

// 2. Export the Hook
export const useSmartSize = () => useContext(SmartSizeContext);

export default function SmartProvider({ children }) {
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get("window"));
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // ANIMATION STATE
  const sidebarWidthAnim = useRef(new Animated.Value(280)).current;

  useEffect(() => {
    Animated.spring(sidebarWidthAnim, {
      toValue: isSidebarCollapsed ? 68 : 280,
      useNativeDriver: false,
      tension: 50, // Slightly lower tension for smoother movement
      friction: 12, // Higher friction to reduce bounce
    }).start();
  }, [isSidebarCollapsed]);
  const router = useRouter();
  const segments = useSegments();
  const { account, usdcBalance, status, disconnect } = useWallet();

  useEffect(() => {
    setIsMounted(true);
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const ratio = windowDimensions.height / windowDimensions.width;

  /**
   * 🖥️ DESKTOP VS MOBILE DETECTION
   * Desktop: Web + Landscape mode.
   * Mobile: Native OR Web in Portrait/Narrow mode.
   */
  const isDesktop = isMounted ? Platform.OS === "web" && ratio < 1.2 && windowDimensions.width > 768 : false;

  const context = useContext(ContextModule);

  const chatGeneral = context?.value?.chatGeneral || [];
  const totalSpend = chatGeneral.reduce((acc, msg) => {
    if (msg.receipt) {
      const val = parseFloat(msg.receipt.replace("$", ""));
      return acc + (isNaN(val) ? 0 : val);
    }
    return acc;
  }, 0);
  const formattedSpend = `$${Number(totalSpend.toFixed(6)).toString()}`;

  const internalSize = useMemo(() => {
    let width, height;
    
    // On desktop, we still want to keep the "focused" app feel for the content, 
    // but the layout itself is full desktop.
    if (!isDesktop) {
      width = windowDimensions.width;
      height = windowDimensions.height;
    } else {
      // Content width on desktop sidebar layout
      // We use a simplified listener for the memo to ensure it reacts to the target state
      const sidebarTarget = isSidebarCollapsed ? 68 : 280;
      width = Math.min(600, windowDimensions.width - sidebarTarget); 
      height = windowDimensions.height;
    }

    const baseScale = width / 375;
    const factor = 0.4;
    const moderateScale = 1 + (baseScale - 1) * factor;
    const clampedScale = Math.max(0.85, Math.min(1.2, moderateScale));
    const normalize = (size) => PixelRatio.roundToNearestPixel(size * clampedScale);

    return {
      width,
      height,
      scale: clampedScale,
      normalize,
      isDesktop,
    };
  }, [windowDimensions, isDesktop]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setFrameSize((prev) => {
      if (Math.round(prev.width) === Math.round(width) && Math.round(prev.height) === Math.round(height)) {
        return prev;
      }
      return { width, height };
    });
  };

  const isActive = (route) => {
    return segments.includes(route);
  };

  /**
   * 🎨 DESKTOP LAYOUT COMPONENTS
   */
  const renderSidebar = () => (
    <Animated.View style={[
      styles.sidebar, 
      { width: sidebarWidthAnim, overflow: 'hidden' }, 
      isSidebarCollapsed && styles.sidebarCollapsed
    ]}>
      <View style={{ width: 280, flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={styles.sidebarTop}>
          <View style={{ 
            flexDirection: isSidebarCollapsed ? 'column' : 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 40 
          }}>
          {!isSidebarCollapsed && (
            <View>
              <Text style={styles.logoText}>AXIOM</Text>
              <Text style={styles.logoSubtext}>0G GATEWAY</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ padding: 4 }}>
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

        <View style={styles.navSection}>
          <TouchableOpacity 
            style={[styles.navItem, isSidebarCollapsed && styles.navItemCollapsed, isActive('main') && styles.navItemActive]}
            onPress={() => router.push('/main')}
          >
            <Ionicons name="chatbox-ellipses-outline" size={20} color={isActive('main') ? "#FFFFFF" : "#9AA0A6"} />
            {!isSidebarCollapsed && <Text style={[styles.navText, isActive('main') && styles.navTextActive]}>AI Assistant</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, isSidebarCollapsed && styles.navItemCollapsed, isActive('dashboard') && styles.navItemActive]}
            onPress={() => router.push('/dashboard')}
          >
            <Feather name="grid" size={20} color={isActive('dashboard') ? "#FFFFFF" : "#9AA0A6"} />
            {!isSidebarCollapsed && <Text style={[styles.navText, isActive('dashboard') && styles.navTextActive]}>Dashboard</Text>}
          </TouchableOpacity>
        </View>

      {(status === 'connected' || !segments.includes('connect')) && (
        <View style={styles.sidebarFooter}>
          {status === 'connected' ? (
            <View style={[styles.walletInfo, isSidebarCollapsed && styles.walletInfoCollapsed]}>
              {isSidebarCollapsed ? (
                <View style={styles.statusDot} />
              ) : (
                <>
                  <View style={styles.walletHeader}>
                    <View style={styles.statusDot} />
                    <Text style={styles.walletAddress}>{account?.substring(0, 6)}...{account?.substring(account.length-4)}</Text>
                  </View>
                  <Text style={styles.walletBalance}>{usdcBalance ? Number(parseFloat(usdcBalance).toFixed(6)).toString() : "0"} USDC</Text>
                  
                  <View style={styles.cardSpendContainer}>
                    <Text style={styles.cardSpendLabel}>Session Spend</Text>
                    <Text style={styles.cardSpendValue}>{formattedSpend}</Text>
                  </View>

                  <TouchableOpacity style={styles.disconnectLink} onPress={disconnect}>
                    <Text style={styles.disconnectLinkText}>Disconnect</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.connectButton, isSidebarCollapsed && styles.connectButtonCollapsed]} 
              onPress={() => router.push('/connect')}
            >
              {isSidebarCollapsed ? (
                <Ionicons name="wallet-outline" size={20} color="#0e0e10" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
     </View>
    </Animated.View>
  );

  return (
    <SmartSizeContext.Provider value={internalSize}>
      <View style={{ flex: 1, backgroundColor: "#0e0e10" }}>
        {isDesktop ? (
          <View style={styles.desktopWrapper}>
            {renderSidebar()}
            <View style={styles.contentArea}>
              <View style={{ width: internalSize.width, height: '100%', alignSelf: 'center' }}>
                {children}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {children}
          </View>
        )}
      </View>
    </SmartSizeContext.Provider>
  );
}


const styles = {
  desktopWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0e0e10',
  },
  sidebar: {
    backgroundColor: '#1E1F20',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarTop: {
    marginBottom: 40,
  },
  logoText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#34D399',
    fontFamily: 'monospace',
    marginTop: -4,
  },
  navSection: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navText: {
    color: '#9AA0A6',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginLeft: 12,
  },
  navTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 24,
  },
  walletInfo: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    borderRadius: 12,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  walletAddress: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  walletBalance: {
    color: '#9AA0A6',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  disconnectLink: {
    alignSelf: 'flex-start',
  },
  disconnectLinkText: {
    color: '#8B0000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
  connectButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#0e0e10',
    fontFamily: 'Inter_700Bold',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#0e0e10',
  },
  cardSpendContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSpendLabel: {
    fontSize: 11,
    color: '#9AA0A6',
    fontFamily: 'Inter_400Regular',
  },
  cardSpendValue: {
    fontSize: 12,
    color: '#34D399',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  sidebarCollapsed: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  navItemCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'center',
  },
  walletInfoCollapsed: {
    padding: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  connectButtonCollapsed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    paddingVertical: 0,
    justifyContent: 'center',
  }
};
