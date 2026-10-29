import { add, average, basalArea, type Formula } from "./formulas_actual";

export type FormulaDefinition = {
  name: string;
  description: string;
  expression?: string;
  calculate: Formula;
};

const formulaDefinitions: Record<string, FormulaDefinition> = {
  add: {
    name: "add",
    description: "Adds all supplied values.",
    calculate: add,
  },
  average: {
    name: "average",
    description: "Calculates the arithmetic mean of the supplied values.",
    calculate: average,
  },
  basal_area: {
    name: "basal_area",
    description: "Calculates basal area from diameter in centimetres.",
    expression: "BA = π × (D/2)²",
    calculate: basalArea,
  },
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function find_formula(name: string): FormulaDefinition[] {
  const search = normalize(name);

  return Object.values(formulaDefinitions).filter((formula) =>
    normalize(formula.name).includes(search),
  );
}

export function get_formula(name: string): FormulaDefinition | undefined {
  return formulaDefinitions[normalize(name)];
}

export function calculate_formula(
  name: string,
  ...values: number[]
): number | undefined {
  return get_formula(name)?.calculate(...values);
}
