import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { loadProject } from "@/projects/storage";
import { Placeholder } from "@/components/Placeholder";
import { useColors } from "@/theme";

export default function Input() {
  const c = useColors();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = useMemo(
    () => (typeof projectId === "string" ? loadProject(projectId) : null),
    [projectId],
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Text style={[styles.projectLabel, { color: c.muted }]}>Current project</Text>
      <Text style={[styles.projectName, { color: c.text }]}>
        {project?.project.name ?? "No project selected"}
      </Text>
      <Placeholder />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  projectLabel: { fontSize: 14, fontWeight: "600" },
  projectName: { fontSize: 22, fontWeight: "700" },
});
