import { storage } from "@/storage";
import { withUpdatedTimestamp, type Entry, type Project, type ProjectDocument } from "./model";

const PROJECT_INDEX_KEY = "masstrack.projects.index";
const PROJECT_KEY_PREFIX = "masstrack.project.";
const ACTIVE_PROJECT_KEY = "masstrack.active-project";
const INPUT_DRAFT_KEY_PREFIX = "masstrack.project.input.";

export function setActiveProjectId(projectId: string): void {
  storage.setItemSync(ACTIVE_PROJECT_KEY, projectId);
}

export function loadActiveProjectId(): string | null {
  return storage.getItemSync(ACTIVE_PROJECT_KEY);
}

export function deleteProject(projectId: string): void {
  const projectIds = readProjectIds().filter((id) => id !== projectId);

  // The Expo SQLite store exposes setItemSync/getItemSync at runtime.
  // Empty values are treated as missing by the project and draft readers.
  storage.setItemSync(projectKey(projectId), "");
  storage.setItemSync(`${INPUT_DRAFT_KEY_PREFIX}${projectId}`, "");
  storage.setItemSync(PROJECT_INDEX_KEY, JSON.stringify(projectIds));

  if (loadActiveProjectId() === projectId) {
    storage.setItemSync(ACTIVE_PROJECT_KEY, "");
  }
}

export function saveProject(document: ProjectDocument): ProjectDocument {
  const savedDocument = withUpdatedTimestamp(document);
  const projectId = savedDocument.project.project_id;
  const projectIds = readProjectIds();

  storage.setItemSync(projectKey(projectId), JSON.stringify(savedDocument));
  if (!projectIds.includes(projectId)) {
    storage.setItemSync(PROJECT_INDEX_KEY, JSON.stringify([...projectIds, projectId]));
  }

  return savedDocument;
}

export function renameProject(projectId: string, name: string): ProjectDocument {
  const document = loadProject(projectId);
  if (document === null) {
    throw new Error("Project not found.");
  }

  const projectName = name.trim();
  if (!projectName) {
    throw new Error("Project name cannot be empty.");
  }

  return saveProject({
    project: {
      ...document.project,
      name: projectName,
    },
  });
}

// Reads the latest saved copy before applying a change, so an older in-memory copy can't overwrite newer data.
export function updateProject(projectId: string, change: (project: Project) => Project): ProjectDocument | null {
  const document = loadProject(projectId);
  return document && saveProject({ project: change(document.project) });
}

export function loadProject(projectId: string): ProjectDocument | null {
  const value = storage.getItemSync(projectKey(projectId));
  return value === null ? null : parseProjectDocument(value);
}

export function loadProjects(): ProjectDocument[] {
  return readProjectIds()
    .map((projectId) => loadProject(projectId))
    .filter((document): document is ProjectDocument => document !== null);
}

function readProjectIds(): string[] {
  const value = storage.getItemSync(PROJECT_INDEX_KEY);
  if (value === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || !parsed.every((id): id is string => typeof id === "string")) {
    return [];
  }
  return parsed;
}

function parseProjectDocument(value: string): ProjectDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isProjectDocument(parsed)) {
    return null;
  }
  // Projects saved before entries existed load with an empty table.
  const dataBlock = parsed.project.data_block;
  return { project: { ...parsed.project, data_block: { ...dataBlock, entries: dataBlock.entries ?? [] } } };
}

function isProjectDocument(value: unknown): value is ProjectDocument {
  if (!isRecord(value) || !isRecord(value.project)) return false;
  const project = value.project;
  if (!isRecord(project.data_block)) return false;
  const dataBlock = project.data_block;
  if (!isRecord(dataBlock.organisms)) return false;
  const organisms = dataBlock.organisms;

  return (
    typeof project.project_id === "string" &&
    typeof project.name === "string" &&
    typeof project.date_created === "string" &&
    typeof project.date_last_edited === "string" &&
    typeof dataBlock.datablock_id === "string" &&
    typeof dataBlock.project_id === "string" &&
    typeof organisms.organisms_id === "string" &&
    typeof organisms.datablock_id === "string" &&
    Array.isArray(organisms.species) &&
    organisms.species.every((species: unknown) => typeof species === "string") &&
    Array.isArray(organisms.equations) &&
    organisms.equations.every((equation: unknown) => typeof equation === "string") &&
    (dataBlock.entries === undefined || (Array.isArray(dataBlock.entries) && dataBlock.entries.every(isEntry)))
  );
}

function isEntry(value: unknown): value is Entry {
  return (
    isRecord(value) &&
    typeof value.entry_id === "string" &&
    typeof value.species === "string" &&
    typeof value.dbh_cm === "number" &&
    (typeof value.height_m === "number" || value.height_m === null) &&
    typeof value.basal_area_cm2 === "number" &&
    typeof value.date_created === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function projectKey(projectId: string): string {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}
