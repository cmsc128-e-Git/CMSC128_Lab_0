import { useLocalSearchParams } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { calculate_formula, get_formula } from "@/dependencies/formulas/registry";
import { find_species } from "@/dependencies/species/species";
import { loadInputDraft, saveInputDraft, type InputDraft } from "@/projects/inputDraft";
import { createUuid, type Entry } from "@/projects/model";
import { loadProject, setActiveProjectId, updateProject } from "@/projects/storage";
import { useColors } from "@/theme";

const icon = (ios: string, android: string) => ({ ios, android, web: android }) as SymbolViewProps["name"];
const STEPS = ["Site", "Species", "Measure", "Compute", "Review"] as const;
const STEP_TITLES = ["Site details", "Species selection", "Measurements", "Compute", "Review analysis"];
const STEP_HELPERS = [
  "* Required · Identify where the field measurements were collected.",
  "* Required · Select the organism represented by these measurements.",
  "* Required · Use positive values in the units shown.",
  "Check the selected equation and calculated result before continuing.",
  "Confirm every entry before saving the analysis.",
];
const SPECIES = find_species("").map(({ species_name }) => species_name);
const BASAL_AREA_FORMULA = get_formula("basal_area");
const SAMPLING_METHODS = ["Quadrat", "Transect", "Point sampling"];
const UNITS = ["cm", "m"];

type StepIndex = 0 | 1 | 2 | 3 | 4;
type DropdownProps = { label: string; value: string; options: string[]; onChange: (value: string) => void; compact?: boolean };

function Dropdown({ label, value, options, onChange, compact = false }: DropdownProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.dropdownWrap, compact && styles.compactDropdown, open && styles.dropdownOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.dropdown, compact && styles.dropdownCompact, { backgroundColor: c.surface, borderColor: open ? c.accent : c.border, opacity: pressed ? 0.75 : 1 }]}
      >
        <Text numberOfLines={1} style={[styles.dropdownText, { color: c.text }]}>{value}</Text>
        <SymbolView name={icon(open ? "chevron.up" : "chevron.down", open ? "keyboard_arrow_up" : "keyboard_arrow_down")} tintColor={c.muted} size={18} />
      </Pressable>
      {open && (
        <View style={[styles.menu, { backgroundColor: c.surface, borderColor: c.border }]}>
          {options.map((option) => (
            <Pressable key={option} accessibilityRole="menuitem" onPress={() => { onChange(option); setOpen(false); }} style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? c.bg : c.surface }]}>
              <Text style={[styles.menuText, { color: c.text }]}>{option}</Text>
              {option === value && <SymbolView name={icon("checkmark", "check")} tintColor={c.accent} size={18} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const c = useColors();
  return <View style={styles.fieldGroup}><Text style={[styles.label, { color: c.text }]}>{label}</Text>{children}</View>;
}

function TextField({ label, value, onChangeText, placeholder, numeric = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; numeric?: boolean }) {
  const c = useColors();
  return (
    <Field label={label}>
      <TextInput accessibilityLabel={label.replace(" *", "")} value={value} onChangeText={onChangeText} keyboardType={numeric ? "decimal-pad" : "default"} placeholder={placeholder} placeholderTextColor={c.inactive} style={[styles.textInput, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]} />
    </Field>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: c.muted }]}>{label}</Text><Text style={[styles.summaryValue, { color: c.text }]}>{value}</Text></View>;
}

export default function Input() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const activeProjectId = typeof projectId === "string" ? projectId : null;

  useEffect(() => {
    if (activeProjectId) setActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  return <GuidedInput key={activeProjectId ?? "no-project"} activeProjectId={activeProjectId} />;
}

function GuidedInput({ activeProjectId }: { activeProjectId: string | null }) {
  const c = useColors();
  const project = useMemo(() => (activeProjectId ? loadProject(activeProjectId) : null), [activeProjectId]);
  const initialDraft = useMemo(() => (activeProjectId ? loadInputDraft(activeProjectId) : null), [activeProjectId]);
  const initialDiameter = initialDraft?.measurements.find((entry) => entry.label === "Diameter at breast height");
  const initialHeight = initialDraft?.measurements.find((entry) => entry.label === "Tree height");

  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [siteName, setSiteName] = useState(initialDraft?.site.name ?? "");
  const [location, setLocation] = useState(initialDraft?.site.location ?? "");
  const [plotNumber, setPlotNumber] = useState(initialDraft?.site.plotNumber ?? "");
  const [samplingMethod, setSamplingMethod] = useState(initialDraft?.site.samplingMethod ?? SAMPLING_METHODS[0]);
  const [species, setSpecies] = useState(initialDraft?.species ?? SPECIES[0] ?? "");
  const [individualCount, setIndividualCount] = useState(initialDraft?.individualCount ?? "1");
  const [dbh, setDbh] = useState(initialDiameter?.value ?? "");
  const [height, setHeight] = useState(initialHeight?.value ?? "");
  const [dbhUnit, setDbhUnit] = useState(initialDiameter?.unit ?? UNITS[0]);
  const [heightUnit, setHeightUnit] = useState(initialHeight?.unit ?? UNITS[1]);

  const basalArea = useMemo(() => {
    if (!isPositiveNumber(dbh)) return null;
    return calculate_formula("basal_area", toCentimetres(dbh, dbhUnit)) ?? null;
  }, [dbh, dbhUnit]);

  if (!project) {
    return (
      <View style={[styles.emptyInput, { backgroundColor: c.bg }]}>
        <Text style={[styles.emptyInputText, { color: c.muted }]}>
          Select a project or create a new one
        </Text>
      </View>
    );
  }

  function buildDraft(dbhValue = dbh, heightValue = height): InputDraft {
    return {
      site: { name: siteName.trim(), location: location.trim(), plotNumber: plotNumber.trim(), samplingMethod },
      species,
      individualCount: individualCount.trim(),
      measurements: [
        { label: "Diameter at breast height", value: dbhValue.trim(), unit: dbhUnit },
        { label: "Tree height", value: heightValue.trim() || null, unit: heightUnit },
      ],
    };
  }

  function validateStep(step: StepIndex): boolean {
    if (!activeProjectId || !project) {
      Alert.alert("No project selected", "Create or open a project before entering analysis data.");
      return false;
    }
    if (step === 0 && (!siteName.trim() || !location.trim() || !plotNumber.trim())) {
      Alert.alert("Complete site details", "Site name, location, and plot number are required.");
      return false;
    }
    if (step === 1 && (!species || !isPositiveInteger(individualCount))) {
      Alert.alert("Check species details", "Select a species and enter a whole number of individuals greater than zero.");
      return false;
    }
    if (step >= 2 && (!isPositiveNumber(dbh) || (height.trim() && !isPositiveNumber(height)))) {
      Alert.alert("Check measurements", "DBH is required, and entered measurements must be positive numbers.");
      return false;
    }
    return true;
  }

  function persistDraft() {
    if (!activeProjectId) return;
    saveInputDraft(activeProjectId, buildDraft());
    updateProject(activeProjectId, (current) => {
      const organisms = current.data_block.organisms;
      return {
        ...current,
        data_block: {
          ...current.data_block,
          organisms: {
            ...organisms,
            species: Array.from(new Set([...organisms.species, species])),
            equations: BASAL_AREA_FORMULA?.expression
              ? Array.from(new Set([...organisms.equations, BASAL_AREA_FORMULA.expression]))
              : organisms.equations,
          },
        },
      };
    });
  }

  // Records the measured individual as a new row in the project's data sheet,
  // then keeps site and species but clears the measurements for the next individual.
  function saveEntry() {
    if (!activeProjectId || basalArea === null) return;
    const entry: Entry = {
      entry_id: createUuid(),
      species,
      dbh_cm: toCentimetres(dbh, dbhUnit),
      height_m: height.trim() ? toMetres(height, heightUnit) : null,
      basal_area_cm2: basalArea,
      date_created: new Date().toISOString(),
    };
    const saved = updateProject(activeProjectId, (current) => ({
      ...current,
      data_block: { ...current.data_block, entries: [...current.data_block.entries, entry] },
    }));
    saveInputDraft(activeProjectId, buildDraft("", ""));
    setDbh("");
    setHeight("");
    setCurrentStep(2);
    Alert.alert("Entry saved", `Row ${saved?.project.data_block.entries.length} added to the data sheet. Measure the next individual.`);
  }

  function goNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep === 4) return saveEntry();
    persistDraft();
    setCurrentStep((currentStep + 1) as StepIndex);
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep((currentStep - 1) as StepIndex);
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return <SiteStep siteName={siteName} setSiteName={setSiteName} location={location} setLocation={setLocation} plotNumber={plotNumber} setPlotNumber={setPlotNumber} samplingMethod={samplingMethod} setSamplingMethod={setSamplingMethod} />;
      case 1:
        return <SpeciesStep species={species} setSpecies={setSpecies} individualCount={individualCount} setIndividualCount={setIndividualCount} />;
      case 2:
        return <MeasureStep species={species} dbh={dbh} setDbh={setDbh} height={height} setHeight={setHeight} dbhUnit={dbhUnit} setDbhUnit={setDbhUnit} heightUnit={heightUnit} setHeightUnit={setHeightUnit} />;
      case 3:
        return <ComputeStep species={species} dbh={dbh} dbhUnit={dbhUnit} basalArea={basalArea} />;
      case 4:
        return <ReviewStep draft={buildDraft()} basalArea={basalArea} />;
    }
  }

  const backLabel = currentStep === 0 ? "Back" : `Back: ${STEPS[currentStep - 1]}`;
  const nextLabel = currentStep === 4 ? "Save entry" : `Next: ${STEPS[currentStep + 1]}`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.projectContext}>
          <Text numberOfLines={1} style={[styles.projectName, { color: c.text }]}>
            {project?.project.name ?? "No project selected"}
          </Text>
        </View>

        <View style={styles.steps} accessibilityLabel={`Step ${currentStep + 1} of ${STEPS.length}: ${STEP_TITLES[currentStep]}`}>
          {STEPS.map((step, index) => {
            const active = index === currentStep;
            const complete = index < currentStep;
            return <View key={step} style={styles.stepItem}><Text style={[styles.stepLabel, { color: active ? c.text : c.muted, fontWeight: active ? "700" : "500" }]}>{step}</Text><View style={[styles.stepLine, { backgroundColor: active || complete ? c.accent : c.border }, active && styles.activeLine]} /></View>;
          })}
        </View>

        <View style={styles.headingBlock}>
          <Text style={[styles.heading, { color: c.text }]}>{`Step ${currentStep + 1} of ${STEPS.length} · ${STEP_TITLES[currentStep]}`}</Text>
          <Text style={[styles.helper, { color: c.muted }]}>{STEP_HELPERS[currentStep]}</Text>
        </View>

        {renderStep()}

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: currentStep === 0 }} disabled={currentStep === 0} onPress={goBack} style={({ pressed }) => [styles.actionButton, { backgroundColor: c.surface, borderColor: c.border, opacity: currentStep === 0 ? 0.45 : pressed ? 0.75 : 1 }]}>
            <Text style={[styles.actionText, { color: c.text }]}>{backLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goNext} style={({ pressed }) => [styles.actionButton, styles.nextButton, { backgroundColor: c.accent, borderColor: c.accent, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[styles.actionText, { color: c.onAccent }]}>{nextLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type SiteStepProps = { siteName: string; setSiteName: (v: string) => void; location: string; setLocation: (v: string) => void; plotNumber: string; setPlotNumber: (v: string) => void; samplingMethod: string; setSamplingMethod: (v: string) => void };
function SiteStep(props: SiteStepProps) {
  return <View style={styles.stepContent}><TextField label="Site name *" value={props.siteName} onChangeText={props.setSiteName} placeholder="e.g. UP Arboretum" /><TextField label="Location *" value={props.location} onChangeText={props.setLocation} placeholder="Municipality, province" /><TextField label="Plot number *" value={props.plotNumber} onChangeText={props.setPlotNumber} placeholder="e.g. Plot 01" /><Field label="Sampling method *"><Dropdown label="Sampling method" value={props.samplingMethod} options={SAMPLING_METHODS} onChange={props.setSamplingMethod} /></Field></View>;
}

function SpeciesStep({ species, setSpecies, individualCount, setIndividualCount }: { species: string; setSpecies: (v: string) => void; individualCount: string; setIndividualCount: (v: string) => void }) {
  const c = useColors();
  return <View style={styles.stepContent}><View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>01</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>Organism</Text><Text style={[styles.formula, { color: c.muted }]}>One species record for this analysis</Text></View></View><View style={[styles.divider, { backgroundColor: c.border }]} /><Field label="Species *"><Dropdown label="Species" value={species} options={SPECIES} onChange={setSpecies} /></Field><TextField label="Number of individuals *" value={individualCount} onChangeText={setIndividualCount} placeholder="1" numeric /></View></View>;
}

type MeasureStepProps = { species: string; dbh: string; setDbh: (v: string) => void; height: string; setHeight: (v: string) => void; dbhUnit: string; setDbhUnit: (v: string) => void; heightUnit: string; setHeightUnit: (v: string) => void };
function MeasureStep(props: MeasureStepProps) {
  const c = useColors();
  return <View style={styles.stepContent}><Field label="Species"><View style={[styles.readOnlyField, { backgroundColor: c.surface, borderColor: c.border }]}><Text numberOfLines={1} style={[styles.dropdownText, { color: c.text }]}>{props.species}</Text></View></Field><View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>Eq.1</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>Basal area</Text><Text style={[styles.formula, { color: c.muted }]}>{BASAL_AREA_FORMULA?.expression ?? "Formula unavailable"}</Text></View><SymbolView name={icon("chevron.down", "keyboard_arrow_down")} tintColor={c.muted} size={18} /></View><View style={[styles.divider, { backgroundColor: c.border }]} /><MeasurementField label="Diameter at breast height (D) *" value={props.dbh} onChange={props.setDbh} unit={props.dbhUnit} onUnitChange={props.setDbhUnit} /><MeasurementField label="Tree height (H)" value={props.height} onChange={props.setHeight} unit={props.heightUnit} onUnitChange={props.setHeightUnit} /><View style={[styles.note, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.noteText, { color: c.muted }]}>D = diameter measured 1.3 m above ground.</Text><Text style={[styles.dictionaryText, { color: c.accent }]}>Definition available in the Species Dictionary</Text></View></View></View>;
}

function MeasurementField({ label, value, onChange, unit, onUnitChange }: { label: string; value: string; onChange: (v: string) => void; unit: string; onUnitChange: (v: string) => void }) {
  const c = useColors();
  return <View style={styles.measurementField}><Text style={[styles.label, { color: c.text }]}>{label}</Text><View style={styles.inputRow}><TextInput accessibilityLabel={label.replace(" *", "")} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={c.inactive} style={[styles.numberInput, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} /><Dropdown label={`${label} unit`} value={unit} options={UNITS} onChange={onUnitChange} compact /></View></View>;
}

function ComputeStep({ species, dbh, dbhUnit, basalArea }: { species: string; dbh: string; dbhUnit: string; basalArea: number | null }) {
  const c = useColors();
  return <View style={styles.stepContent}><View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>Eq.1</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>Basal area</Text><Text style={[styles.formula, { color: c.muted }]}>{BASAL_AREA_FORMULA?.expression ?? "Formula unavailable"}</Text></View><SymbolView name={icon("function", "functions")} tintColor={c.accent} size={20} /></View><View style={[styles.divider, { backgroundColor: c.border }]} /><SummaryRow label="Species" value={species} /><SummaryRow label="Diameter used" value={`${dbh} ${dbhUnit}`} /><View style={[styles.result, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.resultLabel, { color: c.muted }]}>Calculated basal area</Text><Text style={[styles.resultValue, { color: c.text }]}>{basalArea === null ? "—" : `${basalArea.toFixed(2)} cm²`}</Text></View><Text style={[styles.noteText, { color: c.muted }]}>Diameter values entered in metres are converted to centimetres before calculation.</Text></View></View>;
}

function ReviewStep({ draft, basalArea }: { draft: InputDraft; basalArea: number | null }) {
  const c = useColors();
  const diameter = draft.measurements.find((entry) => entry.label === "Diameter at breast height");
  const height = draft.measurements.find((entry) => entry.label === "Tree height");
  return <View style={styles.stepContent}><ReviewCard title="Site"><SummaryRow label="Site name" value={draft.site.name} /><SummaryRow label="Location" value={draft.site.location} /><SummaryRow label="Plot" value={draft.site.plotNumber} /><SummaryRow label="Method" value={draft.site.samplingMethod} /></ReviewCard><ReviewCard title="Species"><SummaryRow label="Selected species" value={draft.species} /><SummaryRow label="Individuals" value={draft.individualCount} /></ReviewCard><ReviewCard title="Measurements and result"><SummaryRow label="DBH" value={diameter?.value ? `${diameter.value} ${diameter.unit}` : "—"} /><SummaryRow label="Height" value={height?.value ? `${height.value} ${height.unit}` : "Not entered"} /><View style={[styles.result, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.resultLabel, { color: c.muted }]}>Basal area</Text><Text style={[styles.resultValue, { color: c.text }]}>{basalArea === null ? "—" : `${basalArea.toFixed(2)} cm²`}</Text></View></ReviewCard></View>;
}

function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text><View style={[styles.divider, { backgroundColor: c.border }]} />{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 16 }, projectContext: { paddingVertical: 4 }, projectName: { fontSize: 24, fontWeight: "700" }, emptyInput: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, emptyInputText: { fontSize: 16, textAlign: "center" },
  steps: { flexDirection: "row", gap: 4 }, stepItem: { flex: 1, gap: 7 }, stepLabel: { fontSize: 12, textAlign: "center" }, stepLine: { height: 3, borderRadius: 2 }, activeLine: { height: 4 }, headingBlock: { gap: 4 }, heading: { fontSize: 20, fontWeight: "700" }, helper: { fontSize: 13, lineHeight: 18 }, stepContent: { gap: 14 }, fieldGroup: { gap: 7 }, label: { fontSize: 14, fontWeight: "600" },
  textInput: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, readOnlyField: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" }, dropdownWrap: { position: "relative", zIndex: 1 }, compactDropdown: { width: 82 }, dropdownOpen: { zIndex: 100, elevation: 100 }, dropdown: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }, dropdownCompact: { paddingHorizontal: 10 }, dropdownText: { flex: 1, fontSize: 14 }, menu: { position: "absolute", top: 52, left: 0, right: 0, borderWidth: 1, borderRadius: 10, overflow: "hidden", zIndex: 101, elevation: 101 }, menuItem: { minHeight: 46, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, menuText: { flex: 1, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 14 }, cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 }, equationBadge: { width: 42, height: 32, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" }, badgeText: { fontSize: 12, fontWeight: "600" }, cardTitleBlock: { flex: 1, gap: 2 }, cardTitle: { fontSize: 15, fontWeight: "700" }, formula: { fontSize: 12 }, divider: { height: StyleSheet.hairlineWidth }, measurementField: { gap: 7 }, inputRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, numberInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 }, note: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 }, noteText: { fontSize: 12, lineHeight: 17 }, dictionaryText: { fontSize: 13, fontWeight: "600" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }, summaryLabel: { fontSize: 13, flex: 0.42 }, summaryValue: { fontSize: 13, fontWeight: "600", textAlign: "right", flex: 0.58 }, result: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 5 }, resultLabel: { fontSize: 12, fontWeight: "600" }, resultValue: { fontSize: 22, fontWeight: "700" }, actions: { flexDirection: "row", gap: 10 }, actionButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, nextButton: { flex: 1.1 }, actionText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});

const toCentimetres = (value: string, unit: string) => (unit === "m" ? Number(value) * 100 : Number(value));
const toMetres = (value: string, unit: string) => (unit === "cm" ? Number(value) / 100 : Number(value));

function isPositiveNumber(value: string): boolean { const number = Number(value); return value.trim().length > 0 && Number.isFinite(number) && number > 0; }
function isPositiveInteger(value: string): boolean { const number = Number(value); return value.trim().length > 0 && Number.isInteger(number) && number > 0; }
