export type Organisms = {
  organisms_id: string;
  datablock_id: string;
  species: string[];
  equations: string[];
};

export type DataBlock = {
  datablock_id: string;
  project_id: string;
  organisms: Organisms;
};

export type Project = {
  project_id: string;
  name: string;
  date_created: string;
  date_last_edited: string;
  data_block: DataBlock;
};

export type ProjectDocument = {
  project: Project;
};

export function createProject(name: string, now = new Date()): ProjectDocument {
  const projectName = name.trim();
  if (!projectName) throw new Error("Project name cannot be empty.");

  const projectId = createUuid();
  const datablockId = createUuid();
  const timestamp = now.toISOString();

  return {
    project: {
      project_id: projectId,
      name: projectName,
      date_created: timestamp,
      date_last_edited: timestamp,
      data_block: {
        datablock_id: datablockId,
        project_id: projectId,
        organisms: {
          organisms_id: createUuid(),
          datablock_id: datablockId,
          species: [],
          equations: [],
        },
      },
    },
  };
}

export function withUpdatedTimestamp(document: ProjectDocument, now = new Date()): ProjectDocument {
  return { project: { ...document.project, date_last_edited: now.toISOString() } };
}

function createUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
