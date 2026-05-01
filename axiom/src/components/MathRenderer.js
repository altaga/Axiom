/**
 * MathRenderer.js
 *
 * Renders LaTeX math using KaTeX on web (true math symbols).
 * Falls back to a styled monospace block on native.
 *
 * DESIGN SYSTEM:
 *   - Editorial Off-white containers: #F9F9F6
 *   - Razor-sharp corners: 0px border radius
 *   - Brutal framing: solid 2px black border
 *   - Hard shadow: box-shadow 4px 4px 0px #000
 */

import { Platform, StyleSheet, Text, View } from "react-native";

// ─────────────────────────────────────────────
// WEB: TRUE KATEX RENDERING
// ─────────────────────────────────────────────
let katex = null;
if (Platform.OS === "web") {
  try {
    katex = require("katex");
    // Inject KaTeX CSS once into the document head.
    if (typeof document !== "undefined" && !document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
      document.head.appendChild(link);
    }
  } catch (_) {
    katex = null;
  }
}

/**
 * WebKatex — renders a single LaTeX expression to HTML via KaTeX.
 * Uses dangerouslySetInnerHTML to inject the output into a div.
 */
function WebKatex({ math, display }) {
  let html = "";
  let error = false;

  try {
    html = katex.renderToString(math, {
      displayMode: display,
      throwOnError: false,
      output: "html",
    });
  } catch (e) {
    error = true;
    html = `<span style="color:#ef4444;font-family:monospace;font-size:13px">${math}</span>`;
  }

  const containerStyle = {
    backgroundColor: "#F9F9F6",
    border: "2px solid #000",
    boxShadow: display ? "4px 4px 0px #000" : "none",
    padding: display ? "16px 20px" : "3px 8px",
    marginTop: display ? "14px" : "0",
    marginBottom: display ? "14px" : "0",
    display: display ? "block" : "inline-block",
    verticalAlign: "middle",
    position: "relative",
    overflow: "visible",
  };

  const labelStyle = display
    ? {
        display: "block",
        fontSize: "8px",
        fontWeight: "700",
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "#666",
        marginBottom: "10px",
        fontFamily: "Inter, monospace",
      }
    : { display: "none" };

  return (
    <div style={containerStyle}>
      {display && <span style={labelStyle}>EQUATION</span>}
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          fontSize: display ? "18px" : "15px",
          lineHeight: display ? "2" : "1.4",
          color: error ? "#ef4444" : "#000",
        }}
      />
    </div>
  );
}

/**
 * NativeKatex — styled monospace fallback for iOS/Android.
 */
function NativeKatex({ math, display }) {
  return (
    <View style={[S.container, display ? S.blockContainer : S.inlineContainer]}>
      {display && <Text style={S.label}>EQUATION</Text>}
      <Text style={S.math}>{math}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    backgroundColor: "#F9F9F6",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 0,
    padding: 12,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: { elevation: 4 },
    }),
  },
  blockContainer: { alignSelf: "stretch" },
  inlineContainer: { alignSelf: "flex-start", padding: 4, marginVertical: 2 },
  label: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 6,
  },
  math: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    color: "#000",
    lineHeight: 22,
  },
});

/**
 * MathRenderer — the exported component.
 * Picks KaTeX on web, native fallback on mobile.
 */
export default function MathRenderer({ math, display = false }) {
  if (!math) return null;
  return Platform.OS === "web" ? (
    <WebKatex math={math} display={display} />
  ) : (
    <NativeKatex math={math} display={display} />
  );
}
