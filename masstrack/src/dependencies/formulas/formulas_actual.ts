/**
 * Formula implementations belong in this module.
 *
 * Keep these functions independent from user-facing names. The registry maps
 * those names to the exported functions below.
 */

export type Formula = (...values: number[]) => number;

export function add(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function average(...values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return add(...values) / values.length;
}

export function basalArea(diameter: number): number {
  return Math.PI * Math.pow(diameter / 2, 2);
}
