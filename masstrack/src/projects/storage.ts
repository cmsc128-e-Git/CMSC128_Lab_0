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

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((id): id is string => typeof id === "string")) {
    throw new Error("Stored project index is invalid.");
  }
  return parsed;
}

function parseProjectDocument(value: string): ProjectDocument {
  const parsed: unknown = JSON.parse(value);
  if (!isProjectDocument(parsed)) {
    throw new Error("Stored project data is invalid.");
  }
  return parsed;
}

function isProjectDocument(value: unknown): value is ProjectDocument {
  if (!value || typeof value !== "object" || !("project" in value)) return false;
  const project = value.project;
  if (!project || typeof project !== "object" || !("data_block" in project)) return false;
  const dataBlock = project.data_block;
  if (!dataBlock || typeof dataBlock !== "object" || !("organisms" in dataBlock)) return false;
  const organisms = dataBlock.organisms;

  return (
    typeof project.project_id === "string" &&
    typeof project.name === "string" &&
    typeof project.date_created === "string" &&
    typeof project.date_last_edited === "string" &&
    typeof dataBlock.datablock_id === "string" &&
    typeof dataBlock.project_id === "string" &&
    !!organisms &&
    typeof organisms === "object" &&
    typeof organisms.organisms_id === "string" &&
    typeof organisms.datablock_id === "string" &&
    Array.isArray(organisms.species) &&
    organisms.species.every((species) => typeof species === "string") &&
    Array.isArray(organisms.equations) &&
    organisms.equations.every((equation) => typeof equation === "string")
  );
}

function projectKey(projectId: string): string {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}
