
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useColors } from "@/theme";
import { find_formula, get_formula } from "@/dependencies/formulas/registry";

const icon = (ios: string, android: string) =>
  ({ ios, android, web: android }) as SymbolViewProps["name"];

type DictionaryTab = "Symbols" | "Formulas" | "Data types";

type DictionaryEntry = {
  id: string;
  symbol: string;
  name: string;
  unit: string;
  description: string;
  kind: DictionaryTab;
  expression?: string;
  formulaName?: string;
  usedIn?: string;
};

const SYMBOLS: DictionaryEntry[] = [
  {
    id: "D",
    symbol: "D",
    name: "Diameter at breast height",
    unit: "cm",
    description: "The diameter of a tree trunk measured at breast height.",
    kind: "Symbols",
    usedIn: "Step 4 · Compute",
  },
  {
    id: "H",
    symbol: "H",
    name: "Total tree height",
    unit: "m",
    description: "The total vertical height of a tree.",
    kind: "Symbols",
    usedIn: "Step 4 · Compute",
  },
  {
    id: "rho",
    symbol: "ρ",
    name: "Wood density",
    unit: "g/cm³",
    description: "The density of the wood used in biomass calculations.",
    kind: "Symbols",
    usedIn: "Step 4 · Compute",
  },
  {
    id: "BA",
    symbol: "BA",
    name: "Basal area",
    unit: "m²",
    description: "The cross-sectional area of a tree trunk at breast height.",
    kind: "Symbols",
    expression: "BA = π × (D / 200)²",
    usedIn: "Step 4 · Compute",
  },
  {
    id: "AGB",
    symbol: "AGB",
    name: "Above-ground biomass",
    unit: "kg · calculated output",
    description:
      "Dry mass of the living plant material above the soil, per tree or per area.",
    kind: "Symbols",
    expression: "AGB = f(ρ, D, H)",
    usedIn: "Step 4 · Compute",
  },
];

const DATA_TYPES: DictionaryEntry[] = [
  {
    id: "number",
    symbol: "123",
    name: "Number",
    unit: "Numeric value",
    description: "A value used in measurements and mathematical calculations.",
    kind: "Data types",
  },
  {
    id: "integer",
    symbol: "42",
    name: "Integer",
    unit: "Whole number",
    description: "A number without a fractional or decimal part.",
    kind: "Data types",
  },
  {
    id: "decimal",
    symbol: "1.5",
    name: "Decimal",
    unit: "Number with a fractional part",
    description: "A numeric value that can contain a decimal component.",
    kind: "Data types",
  },
  {
    id: "string",
    symbol: "Aa",
    name: "Text",
    unit: "String",
    description: "Text used for project names, species names, and labels.",
    kind: "Data types",
  },
  {
    id: "boolean",
    symbol: "T/F",
    name: "Boolean",
    unit: "True or false",
    description: "A value representing one of two states.",
    kind: "Data types",
  },
];

const TABS: DictionaryTab[] = ["Symbols", "Formulas", "Data types"];

export default function Dictionary() {
  const c = useColors();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DictionaryTab>("Symbols");
  const [expandedId, setExpandedId] = useState<string | null>("AGB");

  // Retrieve the actual registered formula definitions.
  const formulas = useMemo(
    () => [get_formula("add"), get_formula("average"), get_formula("basal_area")].filter(
      (formula) => formula !== undefined,
    ),
    [],
  );

  const results = useMemo<DictionaryEntry[]>(() => {
    const q = query.trim().toLocaleLowerCase();

    if (activeTab === "Formulas") {
      return formulas
        .filter((formula) => {
          if (!q) return true;

          // Also allow partial formula-name searches through the registry.
          const matchedNames = find_formula(q).map((item) => item.name);
          return (
            matchedNames.includes(formula.name) ||
            formula.description.toLocaleLowerCase().includes(q)
          );
        })
        .map((formula) => ({
          id: formula.name,
          symbol: "ƒ",
          name: formula.name,
          unit: "Function · numeric output",
          description: formula.description,
          kind: "Formulas" as DictionaryTab,
          expression: formula.expression ?? `${formula.name}(...values)`,
          formulaName: formula.name,
        }));
    }

    const entries = activeTab === "Symbols" ? SYMBOLS : DATA_TYPES;

    return entries.filter((entry) => {
      if (!q) return true;

      return [
        entry.symbol,
        entry.name,
        entry.unit,
        entry.description,
        entry.expression ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(q));
    });
  }, [activeTab, formulas, query]);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: c.text }]}>
          Formula dictionary
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Help"
          onPress={() =>
            setExpandedId((current) =>
              current === "help" ? null : "help",
            )
          }
          style={styles.helpButton}
        >
          <Text style={[styles.helpText, { color: c.muted }]}>Help</Text>
        </Pressable>
      </View>

      {expandedId === "help" && (
        <View
          style={[
            styles.helpCard,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.description, { color: c.text }]}>
            Search by name or symbol. Select a category, then expand an entry
            to view its definition, units, and related calculations.
          </Text>
        </View>
      )}

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
          placeholder="Search symbol, formula or data type"
          placeholderTextColor={c.muted}
          accessibilityLabel="Search symbol, formula or data type"
          returnKeyType="search"
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

      <View style={[styles.tabs, { borderColor: c.border }]}>
        {TABS.map((tab) => {
          const selected = activeTab === tab;

          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setActiveTab(tab);
                setExpandedId(null);
              }}
              style={[
                styles.tab,
                {
                  borderBottomColor: selected ? c.accent : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selected ? c.accent : c.text },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.resultCount, { color: c.muted }]}>
        {results.length} {results.length === 1 ? "entry" : "entries"}
      </Text>

      <View style={styles.entries}>
        {results.map((entry) => {
          const expanded = expandedId === entry.id;

          return (
            <View
              key={entry.id}
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
                accessibilityLabel={`${entry.name}, ${expanded ? "collapse" : "expand"} definition`}
                onPress={() =>
                  setExpandedId((current) =>
                    current === entry.id ? null : entry.id,
                  )
                }
                style={styles.cardHeader}
              >
                <Text
                  style={[styles.symbol, { color: c.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {entry.symbol}
                </Text>

                <View style={styles.cardText}>
                  <Text
                    style={[styles.name, { color: c.text }]}
                    numberOfLines={2}
                  >
                    {entry.name}
                  </Text>
                  <Text
                    style={[styles.meta, { color: c.muted }]}
                    numberOfLines={2}
                  >
                    Unit: {entry.unit}
                  </Text>
                </View>

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
                    {entry.description}
                  </Text>

                  {entry.expression && (
                    <View
                      style={[
                        styles.expression,
                        { backgroundColor: c.bg, borderColor: c.border },
                      ]}
                    >
                      <Text
                        style={[styles.expressionText, { color: c.text }]}
                      >
                        {entry.expression}
                      </Text>
                    </View>
                  )}

                  {"formulaName" in entry && entry.formulaName && (
                    <View style={styles.example}>
                      <Text style={[styles.exampleTitle, { color: c.text }]}>
                        Try an example
                      </Text>
                      <Text style={[styles.description, { color: c.muted }]}>
                        {entry.formulaName === "add"
                          ? "add(2, 3, 5) = 10"
                          : entry.formulaName === "average"
                            ? "average(2, 4, 6) = 4"
                            : "basal_area(10) = 78.54"}
                      </Text>
                    </View>
                  )}

                  {entry.usedIn && (
                    <View style={styles.footer}>
                      <Text style={[styles.usedIn, { color: c.muted }]}>
                        Used in: {entry.usedIn}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.navigate("/input")}
                        style={styles.openButton}
                      >
                        <Text style={[styles.openText, { color: c.text }]}>
                          Open in calculator
                        </Text>
                        <SymbolView
                          name={icon(
                            "arrow.right",
                            "arrow_forward",
                          )}
                          tintColor={c.text}
                          size={16}
                        />
                      </Pressable>
                    </View>
                  )}
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
            <SymbolView
              name={icon("magnifyingglass", "search")}
              tintColor={c.muted}
              size={28}
            />
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              No matching entries
            </Text>
            <Text style={[styles.description, { color: c.muted }]}>
              Try another name, symbol, or search term.
            </Text>
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
            >
              <Text style={[styles.openText, { color: c.text }]}>
                Clear search
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: 920,
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },
  headingRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  helpButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  helpText: {
    fontSize: 14,
  },
  helpCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 14,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultCount: { fontSize: 13 },
  entries: {
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardHeader: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 14,
  },
  symbol: {
    width: 42,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  expression: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  expressionText: {
    fontSize: 14,
  },
  example: {
    gap: 4,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  usedIn: {
    fontSize: 13,
    flexShrink: 1,
  },
  openButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
