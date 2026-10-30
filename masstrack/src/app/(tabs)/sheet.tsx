import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import type { ProjectDocument } from "@/projects/model";
import { loadActiveProjectId, loadProject, setActiveProjectId } from "@/projects/storage";
import { useColors } from "@/theme";

// Column widths are fixed so every row lines up; Species takes the remaining space.
const COLUMNS = [
  { label: "#", width: 36 },
  { label: "Species", flex: 1 },
  { label: "DBH (cm)", width: 72 },
  { label: "H (m)", width: 56 },
  { label: "BA (cm²)*", width: 84 },
];

// The project named in the URL, otherwise the last project selected on the dashboard.
function pickProject(projectId?: string): ProjectDocument | null {
  const activeProjectId = projectId ?? loadActiveProjectId();
  return activeProjectId ? loadProject(activeProjectId) : null;
}

export default function Sheet() {
  const c = useColors();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [document, setDocument] = useState<ProjectDocument | null>(null);

  // Tabs stay mounted, so reload every time the Sheet tab comes into view to show newly saved rows.
  useFocusEffect(
    useCallback(() => {
      const next = pickProject(projectId);
      if (next) setActiveProjectId(next.project.project_id);
      setDocument(next);
    }, [projectId]),
  );

  if (!document) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: c.bg }]}>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No project yet</Text>
          <Text style={[styles.note, styles.emptyNote, { color: c.muted }]}>Create a project from the Projects tab to start recording data.</Text>
          <View style={styles.primaryAction}>
            <Button title="Go to projects" onPress={() => router.navigate("/")} />
          </View>
        </View>
      </View>
    );
  }

  const { project } = document;
  const entries = project.data_block.entries;
  const calculations = project.data_block.calculations ?? [];
  const addEntry = () => router.push({ pathname: "/input", params: { projectId: project.project_id } });

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={[styles.projectName, { color: c.text }]} numberOfLines={1}>{project.name}</Text>
        <Text style={[styles.note, { color: c.muted }]}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · saved on this device
        </Text>
      </View>

      {entries.length === 0 ? (
        <Text style={[styles.note, { color: c.muted }]}>No entries yet. Measure an individual in Input to add the first row.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.table, { borderColor: c.border }]}>
            <View role="row" style={[styles.row, { backgroundColor: c.bg, borderColor: c.border }]}>
              {COLUMNS.map((column, i) => (
                <Text
                  key={column.label}
                  role="columnheader"
                  style={[styles.cell, styles.header, i > 1 && styles.numericCell, { width: column.width, flex: column.flex, color: c.text }]}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {entries.map((entry, index) => (
              <View
                key={entry.entry_id}
                role="row"
                aria-label={`Row ${index + 1}: ${entry.species}, DBH ${entry.dbh_cm} centimetres, basal area ${entry.basal_area_cm2.toFixed(2)} square centimetres`}
                style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                {[
                  String(index + 1),
                  entry.species,
                  entry.dbh_cm.toFixed(1),
                  entry.height_m === null ? "—" : entry.height_m.toFixed(1),
                  entry.basal_area_cm2.toFixed(2),
                ].map((value, i) => (
                  <Text
                    key={COLUMNS[i].label}
                    numberOfLines={1}
                    style={[styles.cell, i > 1 && styles.numericCell, { width: COLUMNS[i].width, flex: COLUMNS[i].flex, color: c.text }, i === COLUMNS.length - 1 && [styles.calculated, { backgroundColor: c.bg }]]}
                  >
                    {value}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {entries.length > 0 && (
        <Text style={[styles.note, { color: c.muted }]}>* Calculated from DBH: BA = π × (D/2)². Read-only; add rows in Input.</Text>
      )}
      {calculations.length > 0 && (
        <View style={styles.calculations}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Saved calculations</Text>
          {calculations.map((calculation) => (
            <View key={calculation.calculation_id} style={[styles.calculation, { borderColor: c.border }]}>
              <Text style={[styles.calculationTitle, { color: c.text }]}>
                {calculation.species} · {calculation.entry_ids.length} {calculation.entry_ids.length === 1 ? "individual" : "individuals"}
              </Text>
              {calculation.equations.map((equation) => {
                const values = calculation.results[equation] ?? [];
                const label = equation === "basal_area"
                  ? "Basal area per individual"
                  : equation === "average"
                    ? "Average basal area"
                    : equation === "add"
                      ? "Total basal area"
                      : equation;
                const value = equation === "basal_area"
                  ? values.map((result) => result.toFixed(2)).join(", ")
                  : values[0]?.toFixed(2) ?? "—";
                return <Text key={equation} style={[styles.calculationResult, { color: c.muted }]}>{label}: {value} cm²</Text>;
              })}
            </View>
          ))}
        </View>
      )}
      <View style={styles.primaryAction}>
        <Button title="+ Add entry" onPress={addEntry} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignSelf: "center", width: "100%", maxWidth: 1120, padding: 20, gap: 16, paddingBottom: 32 },
  primaryAction: { width: "100%", maxWidth: 320, alignSelf: "center" },
  heading: { gap: 2 },
  calculations: { gap: 10, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  calculation: { gap: 6, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  calculationTitle: { fontSize: 14, fontWeight: "600" },
  calculationResult: { fontSize: 13, lineHeight: 18 },
  projectName: { fontSize: 22, fontWeight: "700" },
  table: { borderWidth: 1, borderRadius: 8, overflow: "hidden", minWidth: 560 },
  row: { flexDirection: "row", minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { paddingHorizontal: 10, paddingVertical: 14, fontSize: 14 },
  header: { fontSize: 13, fontWeight: "700" },
  numericCell: { textAlign: "right" },
  calculated: { fontWeight: "700" },
  note: { fontSize: 14, lineHeight: 20 },
  emptyScreen: { flex: 1, padding: 20, justifyContent: "center" },
  empty: { width: "100%", maxWidth: 520, alignSelf: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 24, fontWeight: "700" },
  emptyNote: { textAlign: "center" },
});
