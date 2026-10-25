import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/theme";

// Stand-in body for tabs that are built in later sprints. The tab header already shows the title.
export function Placeholder() {
  const c = useColors();

  return (
    <View style={styles.center}>
      <Text style={{ color: c.muted }}>Coming in a later sprint.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
