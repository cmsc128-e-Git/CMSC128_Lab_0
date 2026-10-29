
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
    () => [get_formula("add"), get_formula("average")].filter(
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
          expression:
            formula.name === "add"
              ? "add(...values)"
              : formula.name === "average"
                ? "average(...values)"
                : formula.name,
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

      <Text style={[styles.hint, { color: c.muted }]}>
        Search by name or symbol. Expand a definition to see units and where
        the formula is used.
      </Text>

      <View style={styles.tabs}>
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
                  backgroundColor: selected ? c.accent : c.surface,
                  borderColor: selected ? c.accent : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selected ? c.onAccent : c.text },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
                <View
                  style={[
                    styles.symbolTile,
                    { backgroundColor: c.bg },
                  ]}
                >
                  <Text
                    style={[styles.symbol, { color: c.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {entry.symbol}
                  </Text>
                </View>

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
                          : "average(2, 4, 6) = 4"}
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
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  headingRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 17,
    fontWeight: "600",
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
    borderRadius: 12,
    padding: 12,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
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
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    marginBottom: 1,
  },
  tab: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
  },
  entries: {
    gap: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    gap: 10,
  },
  symbolTile: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    fontSize: 11,
    lineHeight: 15,
  },
  details: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 10,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  expression: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
  },
  expressionText: {
    fontSize: 12,
  },
  example: {
    gap: 4,
  },
  exampleTitle: {
    fontSize: 12,
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
    fontSize: 11,
    flexShrink: 1,
  },
  openButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
});
