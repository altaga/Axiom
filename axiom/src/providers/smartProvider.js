import frame from "../assets/frame.png";
import { Image } from "expo-image";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, PixelRatio, Platform, View } from "react-native";

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

  useEffect(() => {
    setIsMounted(true);
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const ratio = windowDimensions.height / windowDimensions.width;

  /**
   * 🛡️ HYDRATION GUARD:
   * We must ensure the structure rendered on the client matches the server 
   * during the first pass. We only enable the "Mobile Frame" logic once mounted.
   */
  const isWebMobileView = isMounted ? Platform.OS === "web" && ratio < 1 : false;

  const internalSize = useMemo(() => {
    let width, height;
    if (!isWebMobileView) {
      width = windowDimensions.width;
      height = windowDimensions.height;
    } else {
      width = frameSize.height / 2.3179 || windowDimensions.width;
      height = frameSize.height * 0.7668 || windowDimensions.height;
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
    };
  }, [frameSize, windowDimensions, isWebMobileView]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setFrameSize((prev) => {
      if (Math.round(prev.width) === Math.round(width) && Math.round(prev.height) === Math.round(height)) {
        return prev;
      }
      return { width, height };
    });
  };

  /**
   * 🛠️ CONSISTENT RENDERING:
   * We avoid duplicate Toasters here as they belong in the root _layout.js.
   * We also wrap both views in a consistent outer View to help hydration.
   */
  return (
    <SmartSizeContext.Provider value={internalSize}>
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {isWebMobileView ? (
          <React.Fragment>
            <Image
              source={frame}
              onLayout={handleLayout}
              contentFit="contain"
              style={{
                width: "auto",
                height: windowDimensions.height,
                backgroundColor: "black",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: "11.66%",
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
              pointerEvents="box-none"
            >
              <View
                style={{
                  width: internalSize.width,
                  height: "76.68%",
                  alignSelf: "center",
                  justifyContent: "center",
                }}
              >
                {children}
              </View>
            </View>
          </React.Fragment>
        ) : (
          <View style={{ flex: 1 }}>
            {children}
          </View>
        )}
      </View>
    </SmartSizeContext.Provider>
  );
}
