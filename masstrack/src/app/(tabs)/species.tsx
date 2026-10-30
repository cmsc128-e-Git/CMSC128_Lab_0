import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { find_species } from "@/dependencies/species/species";
import { useColors } from "@/theme";

const icon = (ios: string, android: string) =>
  ({ ios, android, web: android }) as SymbolViewProps["name"];

export default function Species() {
  const c = useColors();
  const [query, setQuery] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const results = useMemo(() => find_species(query), [query]);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: c.text }]}>Species definitions</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Browse species descriptions and identifying traits.
        </Text>
      </View>

      <View
        style={[
          styles.search,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <SymbolView
          name={icon("magnifyingglass", "search")}
          tintColor={c.muted}
          size={20}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search species"
          placeholderTextColor={c.muted}
          accessibilityLabel="Search species"
          autoCorrect={false}
          style={[styles.searchInput, { color: c.text }]}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            style={styles.clearButton}
          >
            <SymbolView
              name={icon("xmark.circle.fill", "cancel")}
              tintColor={c.muted}
              size={20}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.entries}>
        {results.map((species) => {
          const expanded = expandedName === species.species_name;

          return (
            <View
              key={species.species_name}
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: expanded ? c.text : c.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${species.species_name}, ${expanded ? "collapse" : "expand"} definition`}
                onPress={() =>
                  setExpandedName((current) =>
                    current === species.species_name
                      ? null
                      : species.species_name,
                  )
                }
                style={styles.cardHeader                }
              >
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
                    {species.species_name}
                  </Text>
                <SymbolView
                  name={icon(
                    expanded ? "chevron.up" : "chevron.down",
                    expanded ? "expand_less" : "expand_more",
                  )}
                  tintColor={c.muted}
                  size={20}
                />
              </Pressable>

              {expanded && (
                <View style={styles.details}>
                  <Text style={[styles.description, { color: c.muted }]}>
                    {species.desc}
                  </Text>
                  <Text style={[styles.traitsTitle, { color: c.text }]}>
                    Traits
                  </Text>
                  <View style={styles.traits}>
                    {species.traits.map((trait) => (
                      <View key={trait} style={styles.trait}>
                        <Text style={[styles.bullet, { color: c.text }]}>•</Text>
                        <Text style={[styles.traitText, { color: c.muted }]}>
                          {trait}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {results.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              No matching species
            </Text>
            <Text style={[styles.description, { color: c.muted }]}>
              Try another species name.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignSelf: "center", width: "100%", maxWidth: 920, padding: 20, gap: 16, paddingBottom: 32 },
  heading: { gap: 6 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15 },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  entries: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  cardHeader: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  name: { flex: 1, fontSize: 16, fontWeight: "600" },
  details: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  description: { fontSize: 14, lineHeight: 21 },
  traitsTitle: { fontSize: 14, fontWeight: "600" },
  traits: { gap: 7 },
  trait: { flexDirection: "row", gap: 8 },
  bullet: { fontSize: 16, lineHeight: 20 },
  traitText: { flex: 1, fontSize: 14, lineHeight: 20 },
  emptyCard: {
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
});
