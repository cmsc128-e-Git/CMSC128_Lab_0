import { storage } from "@/storage";

export type InputDraft = {
  site: {
    name: string;
    location: string;
    plotNumber: string;
    samplingMethod: string;
  };
  species: string;
  individualCount: string;
  measurements: {
    label: string;
    value: string | null;
    unit: string;
  }[];
};

const INPUT_KEY_PREFIX = "masstrack.project.input.";

export function saveInputDraft(projectId: string, draft: InputDraft): void {
  storage.setItemSync(`${INPUT_KEY_PREFIX}${projectId}`, JSON.stringify(draft));
}

export function loadInputDraft(projectId: string): InputDraft | null {
  const value = storage.getItemSync(`${INPUT_KEY_PREFIX}${projectId}`);
  if (value === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isLegacyInputDraft(parsed)) return null;

  return {
    site: isSiteDraft(parsed.site)
      ? parsed.site
      : { name: "", location: "", plotNumber: "", samplingMethod: "Quadrat" },
    species: parsed.species,
    individualCount: typeof parsed.individualCount === "string" ? parsed.individualCount : "1",
    measurements: parsed.measurements,
  };
}

type LegacyInputDraft = Pick<InputDraft, "species" | "measurements"> & Partial<Pick<InputDraft, "site" | "individualCount">>;

function isLegacyInputDraft(value: unknown): value is LegacyInputDraft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Partial<LegacyInputDraft>;
  return (
    typeof draft.species === "string" &&
    Array.isArray(draft.measurements) &&
    draft.measurements.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.label === "string" &&
        (typeof entry.value === "string" || entry.value === null) &&
        typeof entry.unit === "string",
    )
  );
}

function isSiteDraft(value: unknown): value is InputDraft["site"] {
  if (typeof value !== "object" || value === null) return false;
  const site = value as Partial<InputDraft["site"]>;
  return (
    typeof site.name === "string" &&
    typeof site.location === "string" &&
    typeof site.plotNumber === "string" &&
    typeof site.samplingMethod === "string"
  );
}
