function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => normalize(item));
  }
  if (value instanceof Map) {
    const sortedEntries = [...(value as Map<unknown, unknown>).entries()].sort(([a], [b]) =>
      compareKeys(String(a), String(b)),
    );
    const obj: Record<string, unknown> = {};
    for (const [key, val] of sortedEntries) {
      obj[String(key)] = normalize(val);
    }
    return obj;
  }
  const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    compareKeys(a, b),
  );
  const obj: Record<string, unknown> = {};
  for (const [key, val] of sortedEntries) {
    obj[key] = normalize(val);
  }
  return obj;
}

/**
 * Serializes `value` to canonical JSON: object keys sorted (recursively;
 * array order is preserved), `bigint` values as decimal strings, `Map`
 * values as plain sorted-key objects. The same input always produces
 * byte-identical output (docs/04: no timestamps, reproducible), which is
 * what makes the determinism tests (docs/07) meaningful.
 *
 * @example
 * ```ts
 * toCanonicalJson({ b: 1n, a: 2 }); // '{"a":2,"b":"1"}'
 * ```
 */
export function toCanonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}
