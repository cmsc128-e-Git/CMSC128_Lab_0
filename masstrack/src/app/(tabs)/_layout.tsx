import { Link } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme";

// iOS uses SF Symbols; Android and web use Material Symbols.
const icon = (ios: SFSymbol, android: AndroidSymbol): SymbolViewProps["name"] => ({ ios, android, web: android });

const tabs = [
  { name: "index", title: "Projects", icon: icon("folder", "folder") },
  { name: "input", title: "Input", icon: icon("square.and.pencil", "edit_note") },
  { name: "sheet", title: "Sheet", icon: icon("tablecells", "table") },
  { name: "species", title: "Species", icon: icon("leaf", "eco") },
  { name: "dictionary", title: "Dictionary", icon: icon("book.closed", "menu_book") },
];

// Opens Settings from the Projects header, matching the site map (Projects → Settings).
function SettingsButton() {
  const c = useColors();

  return (
    <Link href="/settings" asChild>
      <Pressable aria-label="Settings" style={styles.headerButton}>
        <SymbolView name={icon("gearshape", "settings")} tintColor={c.text} size={24} />
      </Pressable>
    </Link>
  );
}

export default function TabLayout() {
  const c = useColors();
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "left",
        headerShadowVisible: false,
        headerTitleStyle: styles.title,
        tabBarInactiveTintColor: c.inactive,
        // 64pt bar plus the phone's home-indicator area: bigger targets for gloved hands.
        tabBarStyle: { height: 64 + bottom, paddingTop: 8 },
        tabBarIconStyle: styles.pill,
      }}
    >
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerRight: name === "index" ? SettingsButton : undefined,
            // Active tab = filled accent pill with an inverted icon, so it reads by shape and brightness, not hue alone.
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.pill, focused && { backgroundColor: c.accent }]}>
                <SymbolView name={icon} tintColor={focused ? c.onAccent : color} size={22} />
              </View>
            ),
            tabBarLabel: ({ focused, color, children }) => (
              <Text style={[styles.label, { color, fontWeight: focused ? "600" : "400" }]}>{children}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "600" },
  pill: { width: 52, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, marginTop: 4 },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: 4 },
});
