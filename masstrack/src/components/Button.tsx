import { Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/theme";

type Props = { title: string; onPress?: () => void; variant?: "primary" | "secondary" };

// Figma "Button/Primary" (filled) and "Button/Secondary" (outlined). 48pt tall for gloved hands.
export function Button({ title, onPress, variant = "primary" }: Props) {
  const c = useColors();
  const primary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: primary ? c.accent : c.surface, borderColor: c.accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: primary ? c.onAccent : c.accent }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 48, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: "600" },
});
