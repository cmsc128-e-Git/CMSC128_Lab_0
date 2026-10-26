import speciesData from "@/data/species.json";

export type Species = {
  species_name: string;
  desc: string;
  traits: string[];
};

type SpeciesRecord = {
  desc: string;
  traits: string[];
};

const species: Record<string, SpeciesRecord> = speciesData;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const toSpecies = ([speciesName, info]: [string, SpeciesRecord]): Species => ({
  species_name: speciesName,
  desc: info.desc,
  traits: [...info.traits],
});

/**
 * Finds species whose names contain the supplied search text.
 * An empty search returns every species.
 */
export function find_species(name: string): Species[] {
  const search = normalize(name);

  return Object.entries(species)
    .filter(([speciesName]) => normalize(speciesName).includes(search))
    .map(toSpecies);
}

/**
 * Gets one species by name. When `desc` is supplied, the description must
 * also contain that text.
 */
export function get_species_info(
  name: string,
  desc?: string,
): Species | undefined {
  const info = Object.entries(species).find(([speciesName, speciesInfo]) => {
    const sameName = normalize(speciesName) === normalize(name);
    const matchesDescription =
      desc === undefined || normalize(speciesInfo.desc).includes(normalize(desc));

    return sameName && matchesDescription;
  });

  return info === undefined ? undefined : toSpecies(info);
}
