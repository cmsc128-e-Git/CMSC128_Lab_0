import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Button } from "@/components/Button";
import { createProject, type ProjectDocument } from "@/projects/model";
import {
  loadActiveProjectId,
  loadProjects,
  deleteProject,
  renameProject,
  saveProject,
  setActiveProjectId,
} from "@/projects/storage";
import { useColors } from "@/theme";

// iOS uses SF Symbols; Android and web use Material Symbols (same pattern as the tab layout).
const icon = (ios: string, android: string) => ({ ios, android, web: android }) as SymbolViewProps["name"];

const HOUR = 3_600_000;

const PREVIEW_COUNT = 3;
// TODO: replace with real connectivity (e.g. @react-native-community/netinfo) when sync exists.
const OFFLINE = true;

const TOOLS = [
  { label: "Import sheet", href: "/sheet" },
  { label: "Formulas", href: "/dictionary" },
  { label: "Species", href: "/species" },
] as const;

const plural = (n: number, word: string) =>
  `${n} ${word === "species" || n === 1 ? word : `${word}s`}`;

// "2h ago", "yesterday", "Mon", then "Oct 12".
function formatEdited(ts: number) {
  const hours = (Date.now() - ts) / HOUR;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  const date = new Date(ts);
  return days < 7
    ? date.toLocaleDateString("en", { weekday: "short" })
    : date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function Projects() {
  const c = useColors();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortByName, setSortByName] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setProjects(loadProjects());
      setActiveProjectIdState(loadActiveProjectId());
    }, []),
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = projects.filter(
      (document) =>
        document.project.name.toLowerCase().includes(q) ||
        document.project.data_block.organisms.species.some((species) => species.toLowerCase().includes(q)),
    );
    return matches.sort((a, b) =>
      sortByName
        ? a.project.name.localeCompare(b.project.name)
        : Date.parse(b.project.date_last_edited) - Date.parse(a.project.date_last_edited),
    );
  }, [projects, query, sortByName]);

  // Searching shows every match; "See all" only applies to the default list.
  const searching = query.trim().length > 0;
  const visible = searching || showAll ? results : results.slice(0, PREVIEW_COUNT);
  const canExpand = !searching && results.length > PREVIEW_COUNT;
  const waiting = projects.length;

  function startRename(document: ProjectDocument) {
    setEditingId(document.project.project_id);
    setEditingName(document.project.name);
  }

  function finishRename(projectId: string) {
    try {
      const renamed = renameProject(projectId, editingName);
      setProjects((current) =>
        current.map((document) => (document.project.project_id === projectId ? renamed : document)),
      );
      setEditingId(null);
    } catch (error) {
      Alert.alert("Unable to rename project", error instanceof Error ? error.message : "Please try again.");
    }
  }

  function deleteSelectedProject(projectId: string) {
    deleteProject(projectId);

    setProjects((current) =>
      current.filter((item) => item.project.project_id !== projectId)
    );

    if (activeProjectId === projectId) {
      setActiveProjectIdState(null);
    }
  }

  function confirmDeleteProject(projectId: string, projectName: string) {
    setProjectToDelete({ id: projectId, name: projectName });
  }

  function createNewProject() {
    const created = saveProject(createProject("New Project"));
    setActiveProjectId(created.project.project_id);
    setProjects((current) => [...current, created]);
    router.push({ pathname: "/input", params: { projectId: created.project.project_id } });
  }

  return (
    <>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Sort lives inside the search bar so the header's gear stays dedicated to Settings. */}
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SymbolView name={icon("magnifyingglass", "search")} tintColor={c.muted} size={20} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search projects, species, formulas"
            placeholderTextColor={c.muted}
            accessibilityLabel="Search projects, species, formulas"
            returnKeyType="search"
            autoCorrect={false}
            numberOfLines={1}
            style={[styles.input, { color: c.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort projects. Currently by ${sortByName ? "name" : "last edited"}. Tap to change.`}
            onPress={() => setSortByName((v) => !v)}
            style={styles.sort}
          >
            <SymbolView name={icon("arrow.up.arrow.down", "sort")} tintColor={c.accent} size={22} />
          </Pressable>
        </View>

        <View style={styles.primaryAction}>
          <Button title="+ New vegetation analysis" onPress={createNewProject} />
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: c.text }]}>
            {searching ? "Results" : sortByName ? "Projects A–Z" : "Recent projects"}
          </Text>
          {canExpand && (
            <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} style={styles.seeAll}>
              <Text style={[styles.link, { color: c.accent }]}>{showAll ? "Show less" : "See all"}</Text>
            </Pressable>
          )}
        </View>

        {visible.map((p) => {
          const id = p.project.project_id;
          const isActive = activeProjectId === id;
          const isEditing = editingId === id;

          // Text (+ pill). Contains no buttons, so it can sit inside a Pressable or a View.
          const body = (
            <>
              <View style={styles.cardText}>
                {isEditing ? (
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    accessibilityLabel="Project name"
                    onSubmitEditing={() => finishRename(id)}
                    style={[styles.renameInput, { color: c.text, borderColor: c.accent }]}
                  />
                ) : (
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
                    {p.project.name}
                  </Text>
                )}
                <Text style={[styles.meta, { color: c.muted }]}>
                  {plural(p.project.data_block.organisms.species.length, "species")}
                </Text>
                <Text style={[styles.meta, { color: c.muted }]}>
                  edited {formatEdited(Date.parse(p.project.date_last_edited))}
                </Text>
              </View>
            </>
          );

          return (
            <View
              key={id}
              style={[
                styles.card,
                {
                  backgroundColor: isActive ? c.bg : c.surface,
                  borderColor: isActive ? c.accent : c.border,
                },
              ]}
            >
              {/* Pencil comes first (left of the name). It's a sibling of the main area, never a descendant. */}
              {!isEditing && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${p.project.name}`}
                  onPress={() => startRename(p)}
                  style={styles.pencil}
                >
                  <SymbolView name={icon("pencil", "edit")} tintColor={c.accent} size={20} />
                </Pressable>
              )}

              {/* While renaming, the main area is a plain View so the TextInput isn't inside a button. */}
              {isEditing ? (
                <View style={styles.cardMain}>{body}</View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Open ${p.project.name}`}
                  onPress={() => {
                    setActiveProjectId(id);
                    setActiveProjectIdState(id);
                    router.push({ pathname: "/input", params: { projectId: id } });
                  }}
                  style={({ pressed }) => [styles.cardMain, { opacity: pressed ? 0.7 : 1 }]}
                >
                  {body}
                </Pressable>
              )}

              {isEditing && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save project name"
                  onPress={() => finishRename(id)}
                  style={styles.renameButton}
                >
                  <Text style={[styles.renameAction, { color: c.accent }]}>Save</Text>
                </Pressable>
              )}
              {!isEditing && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${p.project.name}`}
                  onPress={() => confirmDeleteProject(id, p.project.name)}
                  style={styles.deleteButton}
                >
                  <SymbolView name={icon("trash", "delete")} tintColor={c.muted} size={20} />
                </Pressable>
              )}
            </View>
          );
        })}

        {visible.length === 0 && (
          <View style={[styles.empty, { backgroundColor: c.surface }]}>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              {query.trim() ? "No matching projects" : "No projects yet"}
            </Text>
            <Text style={[styles.meta, { color: c.muted }]}>
              {query.trim()
                ? `No projects match “${query.trim()}”. Try another name or species.`
                : "Create a vegetation analysis to start recording field measurements."}
            </Text>
          </View>
        )}

        <Text style={[styles.section, styles.toolsHeading, { color: c.text }]}>Quick tools</Text>
        <View style={styles.tools}>
          {TOOLS.map((t) => (
            <Pressable
              key={t.label}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              onPress={() => router.navigate(t.href)}
              style={({ pressed }) => [
                styles.tool,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Text style={[styles.toolLabel, { color: c.accent }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {OFFLINE && (
          <View style={[styles.notice, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.noticeTitle, { color: c.text }]}>Offline · {waiting} waiting to sync</Text>
            <Text style={[styles.meta, { color: c.muted }]}>
              Projects stay on this device. Reconnect to sync. Import: review column matches before adding data.
            </Text>
          </View>
        )}
      </ScrollView>
          <Modal
            visible={projectToDelete !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setProjectToDelete(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { backgroundColor: c.surface }]}>
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Delete project
                </Text>

                <Text style={[styles.modalMessage, { color: c.muted }]}>
                  Are you sure you want to delete “{projectToDelete?.name}”?
                </Text>

                <View style={styles.modalActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setProjectToDelete(null)}
                    style={[styles.modalButton, { backgroundColor: c.bg, borderColor: c.border }]}
                  >
                    <Text style={[styles.modalCancel, { color: c.text }]}>
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (projectToDelete) {
                        deleteSelectedProject(projectToDelete.id);
                        setProjectToDelete(null);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modalButton,
                      styles.confirmDeleteButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.modalDelete}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignSelf: "center", width: "100%", maxWidth: 1120, padding: 20, gap: 16, paddingBottom: 32 },
  primaryAction: { width: "100%", maxWidth: 320, alignSelf: "center" },
  search: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 8, paddingLeft: 12, gap: 8 },
  input: { flex: 1, height: 48, fontSize: 15 },
  sort: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  section: { fontSize: 18, fontWeight: "600" },
  seeAll: { minHeight: 48, minWidth: 48, alignItems: "flex-end", justifyContent: "center" },
  link: { fontSize: 15, fontWeight: "600" },
  card: { flexDirection: "row", alignItems: "center", minHeight: 76, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, gap: 4 },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  cardText: { flex: 1, gap: 2 },
  renameInput: { minHeight: 36, borderBottomWidth: 1, fontSize: 16 },
  renameButton: { minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  renameAction: { fontSize: 14, fontWeight: "600" },
  pencil: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  deleteButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14 },
  empty: { borderRadius: 8, padding: 16, gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  toolsHeading: { marginTop: 4 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  toolLabel: { fontSize: 14, fontWeight: "600" },
  notice: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 6 },
  noticeTitle: { fontSize: 15, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContainer: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: "600" },
  modalMessage: { fontSize: 15, lineHeight: 22 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  modalButton: { minWidth: 90, minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalCancel: { fontSize: 14, fontWeight: "600" },
  confirmDeleteButton: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  modalDelete: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
