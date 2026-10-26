import { Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { setThemePreference, useColors, useThemePreference, type ThemePreference } from "@/theme";

const options: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings() {
  const c = useColors();
  const preference = useThemePreference();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, title: "Settings" }} />

      <Text style={[styles.heading, { color: c.text }]}>Appearance</Text>

      {/* Segmented control: all choices visible at once; the selected one is a filled accent segment. */}
      <View role="radiogroup" aria-label="Appearance" style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        {options.map(({ value, label }) => {
          const selected = value === preference;
          return (
            <Pressable
              key={value}
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onPress={() => setThemePreference(value)}
              style={[styles.option, selected && { backgroundColor: c.accent }]}
            >
              <Text style={[styles.label, { color: selected ? c.onAccent : c.text, fontWeight: selected ? "600" : "400" }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, { color: c.muted }]}>
        System matches your phone. Light is easiest to read in direct sunlight.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  heading: { fontSize: 16, fontWeight: "600" },
  group: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  option: { flex: 1, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15 },
  hint: { fontSize: 13 },
});
