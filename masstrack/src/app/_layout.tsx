import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors, useScheme } from "@/theme";

export default function RootLayout() {
  const dark = useScheme() === "dark";
  const base = dark ? DarkTheme : DefaultTheme;
  const c = useColors();

  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.surface, text: c.text, border: c.border } }}
    >
      {/* Follow the app's theme, not the phone's, so clock and battery icons stay visible. */}
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }} />
    </ThemeProvider>
  );
}
