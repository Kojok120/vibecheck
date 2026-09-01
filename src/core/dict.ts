/**
 * Locale dictionaries are written with `as const` so the English one documents
 * every key, but the values must widen to `string` for the other locales to be
 * assignable. Functions keep their signature so plural rules stay type-checked.
 */
export type Widen<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R : string
}
