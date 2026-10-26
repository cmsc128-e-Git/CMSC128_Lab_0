import { Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useColors } from "@/theme";

const icon = (ios: string, android: string) => ({ ios, android, web: android }) as SymbolViewProps["name"];

export default function TabsLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 1 },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView name={icon(focused ? "house.fill" : "house", "home")} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: "Formulas",
          tabBarIcon: ({ color }) => <SymbolView name={icon("function", "function")} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="species"
        options={{
          title: "Species",
          tabBarIcon: ({ color }) => <SymbolView name={icon("leaf", "eco")} tintColor={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
