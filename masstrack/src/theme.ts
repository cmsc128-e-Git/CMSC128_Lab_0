import { useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { storage } from "@/storage";

// Neutrals from the Figma wireframe. Accent greens from the Clovers palette:
// forest #1e6033 in light mode; a softer lime in dark mode (brand lime #a0bf1e glares on black).
export const colors = {
  light: {
    bg: "#f7f8f9", surface: "#ffffff", text: "#1f2328", muted: "#4b5258", border: "#dde1e5",
    accent: "#1e6033", onAccent: "#ffffff", inactive: "#6b7178",
  },
  dark: {
    bg: "#121212", surface: "#1e1e1e", text: "#f2f2f2", muted: "#c8c8c8", border: "#3a3a3a",
    accent: "#c4d67a", onAccent: "#121212", inactive: "#9e9e9e",
  },
};

export type Colors = typeof colors.light;
export type ThemePreference = "system" | "light" | "dark";

// The user's choice lives here and on disk; every screen re-renders when it changes.
const KEY = "themePreference";
let preference = (storage.getItemSync(KEY) as ThemePreference | null) ?? "system";
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getPreference = () => preference;

export function setThemePreference(next: ThemePreference) {
  preference = next;
  storage.setItemSync(KEY, next);
  listeners.forEach((listener) => listener());
}

export const useThemePreference = () => useSyncExternalStore(subscribe, getPreference, getPreference);

export function useScheme(): "light" | "dark" {
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const chosen = useThemePreference();
  return chosen === "system" ? system : chosen;
}

export const useColors = (): Colors => colors[useScheme()];
