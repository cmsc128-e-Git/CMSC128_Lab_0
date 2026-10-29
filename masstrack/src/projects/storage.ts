import { storage } from "@/storage";
import { withUpdatedTimestamp, type ProjectDocument } from "./model";

const PROJECT_INDEX_KEY = "masstrack.projects.index";
const PROJECT_KEY_PREFIX = "masstrack.project.";

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
  return parsed;
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
    organisms.equations.every((equation: unknown) => typeof equation === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function projectKey(projectId: string): string {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}
