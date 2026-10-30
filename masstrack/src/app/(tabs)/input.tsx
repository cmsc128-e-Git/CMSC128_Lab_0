import { useLocalSearchParams } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { calculate_formula, get_formula } from "@/dependencies/formulas/registry";
import { find_species } from "@/dependencies/species/species";
import { loadInputDraft, saveInputDraft, type InputDraft } from "@/projects/inputDraft";
import { createUuid, type Calculation, type Entry } from "@/projects/model";
import { loadActiveProjectId, loadProject, renameProject, setActiveProjectId, updateProject } from "@/projects/storage";
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
const FORMULAS = ["basal_area", "average", "add"].map((name) => get_formula(name)).filter(
  (formula) => formula !== undefined,
);
const MAX_INDIVIDUALS = 100;
const SAMPLING_METHODS = ["Quadrat", "Transect", "Point sampling"];
const UNITS = ["cm", "m"];

type StepIndex = 0 | 1 | 2 | 3 | 4;
type IndividualMeasurement = NonNullable<InputDraft["individuals"]>[number];
type DropdownProps = { label: string; value: string; options: string[]; onChange: (value: string) => void; compact?: boolean };

function Dropdown({ label, value, options, onChange, compact = false }: DropdownProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={compact ? styles.compactDropdown : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.dropdown, compact && styles.dropdownCompact, { backgroundColor: c.surface, borderColor: open ? c.accent : c.border, opacity: pressed ? 0.75 : 1 }]}
      >
        <Text numberOfLines={1} style={[styles.dropdownText, { color: c.text }]}>{value.replace("_", " ")}</Text>
        <SymbolView name={icon(open ? "chevron.up" : "chevron.down", open ? "keyboard_arrow_up" : "keyboard_arrow_down")} tintColor={c.muted} size={18} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.dropdownOverlay}>
          <Pressable
            onPress={() => setOpen(false)}
            accessible={false}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={[styles.dropdownModal, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.dropdownModalHeader}>
              <Text style={[styles.dropdownModalTitle, { color: c.text }]}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${label} options`}
                onPress={() => setOpen(false)}
                style={styles.dropdownClose}
              >
                <Text style={[styles.dropdownCloseText, { color: c.accent }]}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownOptions} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option.replace("_", " ")}
                  accessibilityState={{ selected: option === value }}
                  onPress={() => { onChange(option); setOpen(false); }}
                  style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? c.bg : c.surface }]}
                >
                  <Text style={[styles.menuText, { color: c.text }]}>{option.replace("_", " ")}</Text>
                  {option === value && <SymbolView name={icon("checkmark", "check")} tintColor={c.accent} size={18} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  // Tapping the Input tab or "Open in calculator" has no projectId, so fall back to the last opened project.
  const activeProjectId = typeof projectId === "string" ? projectId : loadActiveProjectId() || null;

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
  const projectEquations = project?.project.data_block.organisms.equations
    .map((equation) => equation === BASAL_AREA_FORMULA?.expression ? "basal_area" : equation)
    .filter((equation) => get_formula(equation) !== undefined);
  const savedEquations = Array.from(new Set(initialDraft?.equations?.filter((equation) => get_formula(equation) !== undefined) ?? []));
  const savedProjectEquations = Array.from(new Set(projectEquations ?? []));

  const [projectName, setProjectName] = useState(project?.project.name ?? "");
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [siteName, setSiteName] = useState(initialDraft?.site.name ?? "");
  const [location, setLocation] = useState(initialDraft?.site.location ?? "");
  const [plotNumber, setPlotNumber] = useState(initialDraft?.site.plotNumber ?? "");
  const [samplingMethod, setSamplingMethod] = useState(initialDraft?.site.samplingMethod ?? SAMPLING_METHODS[0]);
  const [species, setSpecies] = useState(initialDraft?.species ?? SPECIES[0] ?? "");
  const [individualCount, setIndividualCount] = useState(initialDraft?.individualCount ?? "1");
  const [individuals, setIndividuals] = useState<IndividualMeasurement[]>(
    initialDraft?.individuals?.slice(0, MAX_INDIVIDUALS) ?? [{
      dbh: initialDiameter?.value ?? "",
      height: initialHeight?.value ?? "",
      dbhUnit: initialDiameter?.unit ?? UNITS[0],
      heightUnit: initialHeight?.unit ?? UNITS[1],
    }],
  );
  const [equations, setEquations] = useState<string[]>(
    savedEquations.length ? savedEquations : savedProjectEquations.length ? savedProjectEquations : ["basal_area"],
  );
  const requestedCount = Number(individualCount);
  const visibleIndividuals = Number.isInteger(requestedCount) && requestedCount > 0 && requestedCount <= MAX_INDIVIDUALS
    ? Array.from({ length: requestedCount }, (_, index) => individuals[index] ?? emptyIndividual())
    : individuals;
  const basalAreas = useMemo(() => visibleIndividuals.map(calculateIndividualBasalArea), [visibleIndividuals]);
  const equationResults = useMemo(
    () => calculateEquationResults(equations, basalAreas),
    [equations, basalAreas],
  );

  if (!project) {
    return (
      <View style={[styles.emptyInput, { backgroundColor: c.bg }]}>
        <Text style={[styles.emptyInputText, { color: c.muted }]}>
          Select a project or create a new one
        </Text>
      </View>
    );
  }

  function buildDraft(nextIndividuals = visibleIndividuals): InputDraft {
    const firstIndividual = nextIndividuals[0] ?? emptyIndividual();
    return {
      site: { name: siteName.trim(), location: location.trim(), plotNumber: plotNumber.trim(), samplingMethod },
      species,
      individualCount: individualCount.trim(),
      equations,
      individuals: nextIndividuals,
      measurements: [
        { label: "Diameter at breast height", value: firstIndividual.dbh.trim(), unit: firstIndividual.dbhUnit },
        { label: "Tree height", value: firstIndividual.height.trim() || null, unit: firstIndividual.heightUnit },
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
    if (step === 1 && (!species || !isPositiveInteger(individualCount) || Number(individualCount) > MAX_INDIVIDUALS)) {
      Alert.alert("Check species details", `Select a species and enter between 1 and ${MAX_INDIVIDUALS} individuals.`);
      return false;
    }
    if (step >= 2 && visibleIndividuals.some((individual) =>
      !isPositiveNumber(individual.dbh) ||
      !Number.isFinite(toCentimetres(individual.dbh, individual.dbhUnit)) ||
      (individual.height.trim() && (!isPositiveNumber(individual.height) || !Number.isFinite(toMetres(individual.height, individual.heightUnit)))),
    )) {
      Alert.alert("Check measurements", "Enter a positive DBH for every individual. Heights are optional, but must be positive when entered.");
      return false;
    }
    if (step >= 2 && equations.some((equation) => equationResults[equation] === undefined)) {
      Alert.alert("Check calculation", "The selected equations must produce finite numeric results for these measurements.");
      return false;
    }
    return true;
  }

  // A blank name puts back the last saved one instead of saving an empty project name.
  function saveProjectName() {
    if (!activeProjectId) return;
    if (!projectName.trim()) return setProjectName(loadProject(activeProjectId)?.project.name ?? "");
    renameProject(activeProjectId, projectName);
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
            equations,
          },
        },
      };
    });
  }

  // Records the measured individual as a new row in the project's data sheet,
  // then keeps site and species but clears the measurements for the next individual.
  function saveEntry() {
    if (!activeProjectId || basalAreas.some((area) => area === null)) {
      Alert.alert("Unable to save calculation", "Check the individual measurements and try again.");
      return;
    }
    const timestamp = new Date().toISOString();
    const entries: Entry[] = visibleIndividuals.map((individual, index) => {
      const basalArea = basalAreas[index]!;
      return {
        entry_id: createUuid(),
        species,
        dbh_cm: toCentimetres(individual.dbh, individual.dbhUnit),
        height_m: individual.height.trim() ? toMetres(individual.height, individual.heightUnit) : null,
        basal_area_cm2: basalArea,
        results: { basal_area: basalArea },
        date_created: timestamp,
      };
    });
    const calculation: Calculation = {
      calculation_id: createUuid(),
      species,
      entry_ids: entries.map((entry) => entry.entry_id),
      equations,
      results: equationResults,
      date_created: timestamp,
    };
    updateProject(activeProjectId, (current) => ({
      ...current,
      data_block: {
        ...current.data_block,
        entries: [...current.data_block.entries, ...entries],
        calculations: [...(current.data_block.calculations ?? []), calculation],
      },
    }));
    const emptyMeasurements = Array.from({ length: visibleIndividuals.length }, emptyIndividual);
    saveInputDraft(activeProjectId, buildDraft(emptyMeasurements));
    setIndividuals(emptyMeasurements);
    setCurrentStep(2);
    Alert.alert("Calculation saved", `${entries.length} ${entries.length === 1 ? "individual" : "individuals"} added to the data sheet.`);
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
        return <SpeciesStep species={species} setSpecies={setSpecies} individualCount={individualCount} setIndividualCount={(value) => {
          setIndividualCount(value);
          const count = Number(value);
          if (Number.isInteger(count) && count > 0 && count <= MAX_INDIVIDUALS) {
            setIndividuals((current) => Array.from({ length: count }, (_, index) => current[index] ?? emptyIndividual()));
          }
        }} />;
      case 2:
        return <MeasureStep
          species={species}
          individuals={visibleIndividuals}
          // Map the visible list, not the stored one: a restored draft can store fewer rows than it shows, which dropped edits.
          onIndividualChange={(index, field, value) => setIndividuals(
            visibleIndividuals.map((individual, row) => row === index ? { ...individual, [field]: value } : individual),
          )}
          equations={equations}
          setEquations={setEquations}
          onAddEquation={() => {
            const next = FORMULAS.find((formula) => !equations.includes(formula.name));
            if (next) setEquations((current) => [...current, next.name]);
          }}
        />;
      case 3:
        return <ComputeStep species={species} individuals={visibleIndividuals} equations={equations} basalAreas={basalAreas} results={equationResults} />;
      case 4:
        return <ReviewStep draft={buildDraft()} basalAreas={basalAreas} equations={equations} results={equationResults} />;
    }
  }

  const backLabel = currentStep === 0 ? "Back" : `Back: ${STEPS[currentStep - 1]}`;
  const nextLabel = currentStep === 4 ? "Save calculation" : `Next: ${STEPS[currentStep + 1]}`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Rename right after creating a project, without going back to Projects. */}
        <View style={[styles.projectContext, { borderColor: c.border }]}>
          <TextInput
            accessibilityLabel="Project name"
            value={projectName}
            onChangeText={setProjectName}
            onBlur={saveProjectName}
            selectTextOnFocus
            returnKeyType="done"
            placeholder="Project name"
            placeholderTextColor={c.inactive}
            style={[styles.projectName, { color: c.text }]}
          />
          <SymbolView name={icon("pencil", "edit")} tintColor={c.muted} size={18} />
        </View>

        <View style={styles.steps} accessibilityLabel={`Step ${currentStep + 1} of ${STEPS.length}: ${STEP_TITLES[currentStep]}`}>
          {STEPS.map((step, index) => {
            const active = index === currentStep;
            const complete = index < currentStep;
            return <View key={step} style={styles.stepItem}><Text style={[styles.stepLabel, { color: active ? c.text : c.muted, fontWeight: active ? "700" : "500" }]}>{step}</Text><View style={[styles.stepLine, { backgroundColor: active || complete ? c.accent : c.border }, active && styles.activeLine]} /></View>;
          })}
        </View>

        <View style={styles.headingBlock}>
          <Text style={[styles.heading, { color: c.text }]}>{STEP_TITLES[currentStep]}</Text>
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
  return <View style={styles.stepContent}><View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>01</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>Organism</Text><Text style={[styles.formula, { color: c.muted }]}>Each individual will have its own measurements.</Text></View></View><View style={[styles.divider, { backgroundColor: c.border }]} /><Field label="Species *"><Dropdown label="Species" value={species} options={SPECIES} onChange={setSpecies} /></Field><TextField label={`Number of individuals (1–${MAX_INDIVIDUALS}) *`} value={individualCount} onChangeText={setIndividualCount} placeholder="1" numeric /></View></View>;
}

type MeasureStepProps = {
  species: string;
  individuals: IndividualMeasurement[];
  onIndividualChange: (index: number, field: keyof IndividualMeasurement, value: string) => void;
  equations: string[];
  setEquations: (equations: string[]) => void;
  onAddEquation: () => void;
};
function MeasureStep(props: MeasureStepProps) {
  const c = useColors();
  const selected = props.equations;
  const unusedFormula = FORMULAS.some((formula) => !selected.includes(formula.name));
  return (
    <View style={styles.stepContent}>
      <Field label="Species"><View style={[styles.readOnlyField, { backgroundColor: c.surface, borderColor: c.border }]}><Text numberOfLines={1} style={[styles.dropdownText, { color: c.text }]}>{props.species}</Text></View></Field>
      <View style={styles.stepContent}>
        {selected.map((name, index) => {
          const formula = get_formula(name);
          if (!formula) return null;
          const options = FORMULAS.filter((option) => option.name === name || !selected.includes(option.name)).map((option) => option.name);
          return (
            <View key={`equation-${index}`} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardHeading}>
                <View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>{`Eq.${index + 1}`}</Text></View>
                <View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>{formula.name.replace("_", " ")}</Text><Text style={[styles.formula, { color: c.muted }]}>{formula.expression ?? formula.description}</Text></View>
                {selected.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Remove equation ${index + 1}`} onPress={() => props.setEquations(selected.filter((_, item) => item !== index))}><Text style={[styles.removeText, { color: c.muted }]}>Remove</Text></Pressable>}
              </View>
              <Dropdown
                label={`Equation ${index + 1}`}
                value={name}
                options={options}
                onChange={(nextName) => props.setEquations(selected.map((equation, item) => item === index ? nextName : equation))}
              />
            </View>
          );
        })}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !unusedFormula }} disabled={!unusedFormula} onPress={props.onAddEquation} style={({ pressed }) => [styles.addEquation, { borderColor: c.border, backgroundColor: c.surface, opacity: unusedFormula ? (pressed ? 0.7 : 1) : 0.5 }]}>
          <Text style={[styles.actionText, { color: c.text }]}>+ Add Equation</Text>
        </Pressable>

      </View>
      {props.individuals.map((individual, index) => (
        <View key={`individual-${index}`} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>{index + 1}</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>Individual {index + 1}</Text></View></View>
          <MeasurementField label={`Diameter at breast height (D) · individual ${index + 1} *`} value={individual.dbh} onChange={(value) => props.onIndividualChange(index, "dbh", value)} unit={individual.dbhUnit} onUnitChange={(value) => props.onIndividualChange(index, "dbhUnit", value)} />
          <MeasurementField label={`Tree height (H) · individual ${index + 1}`} value={individual.height} onChange={(value) => props.onIndividualChange(index, "height", value)} unit={individual.heightUnit} onUnitChange={(value) => props.onIndividualChange(index, "heightUnit", value)} />
          <Text style={[styles.noteText, { color: c.muted }]}>D is measured 1.3 m above ground.</Text>
        </View>
      ))}
    </View>
  );
}

function MeasurementField({ label, value, onChange, unit, onUnitChange }: { label: string; value: string; onChange: (v: string) => void; unit: string; onUnitChange: (v: string) => void }) {
  const c = useColors();
  return <View style={styles.measurementField}><Text style={[styles.label, { color: c.text }]}>{label}</Text><View style={styles.inputRow}><TextInput accessibilityLabel={label.replace(" *", "")} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={c.inactive} style={[styles.numberInput, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} /><Dropdown label={`${label.replace(" *", "")} unit`} value={unit} options={UNITS} onChange={onUnitChange} compact /></View></View>;
}

function ComputeStep({ species, individuals, equations, basalAreas, results }: { species: string; individuals: IndividualMeasurement[]; equations: string[]; basalAreas: (number | null)[]; results: Record<string, number[]> }) {
  const c = useColors();
  return (
    <View style={styles.stepContent}>
      <SummaryRow label="Species" value={species} />
      {equations.map((name, index) => {
        const formula = get_formula(name);
        const values = results[name] ?? [];
        return (
          <View key={name} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.cardHeading}><View style={[styles.equationBadge, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.badgeText, { color: c.muted }]}>{`Eq.${index + 1}`}</Text></View><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, { color: c.text }]}>{formula?.name.replace("_", " ") ?? name}</Text><Text style={[styles.formula, { color: c.muted }]}>{formula?.expression ?? formula?.description}</Text></View></View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            {name === "basal_area"
              ? basalAreas.map((area, individualIndex) => <SummaryRow key={individualIndex} label={`Individual ${individualIndex + 1} · D ${+toCentimetres(individuals[individualIndex].dbh, individuals[individualIndex].dbhUnit).toFixed(2)} cm`} value={area === null ? "—" : `${area.toFixed(2)} cm²`} />)
              : <View style={[styles.result, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.resultLabel, { color: c.muted }]}>{name === "average" ? "Average basal area" : "Total basal area"}</Text><Text style={[styles.resultValue, { color: c.text }]}>{values[0] === undefined ? "—" : `${values[0].toFixed(2)} cm²`}</Text></View>}
          </View>
        );
      })}
      <Text style={[styles.noteText, { color: c.muted }]}>Add and average use the basal area of every measured individual. DBH values entered in metres are converted to centimetres.</Text>
    </View>
  );
}

function ReviewStep({ draft, basalAreas, equations, results }: { draft: InputDraft; basalAreas: (number | null)[]; equations: string[]; results: Record<string, number[]> }) {
  const c = useColors();
  return <View style={styles.stepContent}><ReviewCard title="Site"><SummaryRow label="Site name" value={draft.site.name} /><SummaryRow label="Location" value={draft.site.location} /><SummaryRow label="Plot" value={draft.site.plotNumber} /><SummaryRow label="Method" value={draft.site.samplingMethod} /></ReviewCard><ReviewCard title="Species"><SummaryRow label="Selected species" value={draft.species} /><SummaryRow label="Individuals" value={draft.individualCount} /></ReviewCard><ReviewCard title="Measurements and results">{(draft.individuals ?? []).map((individual, index) => <View key={index} style={styles.individualSummary}><Text style={[styles.cardTitle, { color: c.text }]}>Individual {index + 1}</Text><SummaryRow label="DBH" value={`${individual.dbh} ${individual.dbhUnit}`} /><SummaryRow label="Height" value={individual.height ? `${individual.height} ${individual.heightUnit}` : "Not entered"} /><SummaryRow label="Basal area" value={basalAreas[index] === null ? "—" : `${basalAreas[index]?.toFixed(2)} cm²`} /></View>)}{equations.filter((name) => name !== "basal_area").map((name) => <View key={name} style={[styles.result, { backgroundColor: c.bg, borderColor: c.border }]}><Text style={[styles.resultLabel, { color: c.muted }]}>{name === "average" ? "Average basal area" : "Total basal area"}</Text><Text style={[styles.resultValue, { color: c.text }]}>{results[name]?.[0]?.toFixed(2) ?? "—"} cm²</Text></View>)}</ReviewCard></View>;
}

function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}><Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text><View style={[styles.divider, { backgroundColor: c.border }]} />{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, alignSelf: "center", width: "100%", maxWidth: 920, padding: 20, paddingBottom: 32, gap: 18 },
  projectContext: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1 },
  projectName: { flex: 1, minHeight: 48, fontSize: 18, fontWeight: "600" },
  emptyInput: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyInputText: { fontSize: 16, textAlign: "center" },
  steps: { flexDirection: "row", gap: 6 },
  stepItem: { flex: 1, gap: 7 },
  stepLabel: { fontSize: 12, textAlign: "center" },
  stepLine: { height: 3, borderRadius: 2 },
  activeLine: { height: 4 },
  headingBlock: { gap: 6 },
  heading: { fontSize: 24, fontWeight: "700" },
  helper: { fontSize: 14, lineHeight: 20 },
  stepContent: { gap: 14 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 14, fontWeight: "600" },
  textInput: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  readOnlyField: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  compactDropdown: { width: 82 },
  dropdown: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  dropdownCompact: { paddingHorizontal: 10 },
  dropdownText: { flex: 1, fontSize: 14 },
  dropdownOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0, 0, 0, 0.35)" },
  dropdownModal: { width: "100%", maxWidth: 420, maxHeight: "75%", borderWidth: 1, borderRadius: 8, padding: 8, gap: 4, overflow: "hidden" },
  dropdownModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12 },
  dropdownModalTitle: { flex: 1, fontSize: 16, fontWeight: "600", paddingTop: 10, paddingBottom: 6 },
  dropdownClose: { minWidth: 56, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dropdownCloseText: { fontSize: 14, fontWeight: "600" },
  dropdownOptions: { flexGrow: 0, maxHeight: 480 },
  menuItem: { minHeight: 46, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  menuText: { flex: 1, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 14 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  equationBadge: { width: 42, height: 32, borderWidth: 1, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  cardTitleBlock: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  formula: { fontSize: 13, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth },
  measurementField: { gap: 7 },
  inputRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  numberInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  note: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 6 },
  noteText: { fontSize: 13, lineHeight: 18 },
  dictionaryText: { fontSize: 13, fontWeight: "600" },
  addEquation: { minHeight: 48, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  removeText: { fontSize: 13, fontWeight: "600" },
  individualSummary: { gap: 8, paddingVertical: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  summaryLabel: { fontSize: 14, flex: 0.42 },
  summaryValue: { fontSize: 14, fontWeight: "600", textAlign: "right", flex: 0.58 },
  result: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 5 },
  resultLabel: { fontSize: 13, fontWeight: "600" },
  resultValue: { fontSize: 22, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  nextButton: { flex: 1.1 },
  actionText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});

// Plain decimals only ("12.5", "12,5", ".5"). Number() alone would also accept "0x10", "1e3", or "Infinity".
const parseMeasure = (value: string) => (/^\s*(\d+([.,]\d*)?|[.,]\d+)\s*$/.test(value) ? Number(value.trim().replace(",", ".")) : NaN);
const toCentimetres = (value: string, unit: string) => (unit === "m" ? parseMeasure(value) * 100 : parseMeasure(value));
const toMetres = (value: string, unit: string) => (unit === "cm" ? parseMeasure(value) / 100 : parseMeasure(value));

function isPositiveNumber(value: string): boolean { return parseMeasure(value) > 0; }
function isPositiveInteger(value: string): boolean { const number = Number(value); return value.trim().length > 0 && Number.isInteger(number) && number > 0; }

function emptyIndividual(): IndividualMeasurement {
  return { dbh: "", height: "", dbhUnit: UNITS[0], heightUnit: UNITS[1] };
}

function calculateIndividualBasalArea(individual: IndividualMeasurement): number | null {
  if (!isPositiveNumber(individual.dbh)) return null;
  const result = calculate_formula("basal_area", toCentimetres(individual.dbh, individual.dbhUnit));
  return result !== undefined && Number.isFinite(result) ? result : null;
}

function calculateEquationResults(equations: string[], basalAreas: (number | null)[]): Record<string, number[]> {
  if (basalAreas.some((area) => area === null)) return {};
  const values = basalAreas.filter((area): area is number => area !== null);
  return Object.fromEntries(equations.flatMap((name) => {
    if (name === "basal_area") return [[name, values]];
    const result = calculate_formula(name, ...values);
    return result === undefined || !Number.isFinite(result) ? [] : [[name, [result]]];
  }));
}
