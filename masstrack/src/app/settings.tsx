import { Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ headerShown: true, title: "Settings" }} />

      <View style={styles.headingBlock}>
        <Text style={[styles.heading, { color: c.text }]}>Appearance</Text>
        <Text style={[styles.hint, { color: c.muted }]}>
          Choose how MassTrack looks on this device.
        </Text>
      </View>

      <View role="radiogroup" aria-label="Appearance" style={[styles.group, { borderColor: c.border }]}>
        {options.map(({ value, label }) => {
          const selected = value === preference;
          return (
            <Pressable
              key={value}
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onPress={() => setThemePreference(value)}
              style={[styles.option, { borderBottomColor: selected ? c.accent : "transparent" }]}
            >
              <Text style={[styles.label, { color: selected ? c.text : c.muted, fontWeight: selected ? "600" : "400" }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, { color: c.muted }]}>
        System follows the appearance setting on your device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignSelf: "center", width: "100%", maxWidth: 720, padding: 20, gap: 20 },
  headingBlock: { gap: 6 },
  heading: { fontSize: 24, fontWeight: "700" },
  group: { flexDirection: "row", borderBottomWidth: 1, gap: 8 },
  option: { flex: 1, minHeight: 52, borderBottomWidth: 2, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15 },
  hint: { fontSize: 14, lineHeight: 20 },
});
