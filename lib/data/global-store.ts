// Process-wide singleton registry anchored on `globalThis`.
//
// Next.js bundles Route Handlers and Server Components into SEPARATE module
// instances, so a plain module-level `const store = new Map()` is duplicated:
// a write through an /api route handler is invisible to a page render (and
// vice versa), and the in-memory store also gets re-created on dev HMR. Anchoring
// the state on `globalThis` gives every bundle/instance the SAME object, so the
// in-memory session/cart/order/account state behaves as one store across the
// whole server process. (Same rationale as the well-known Prisma-client pattern.)
//
// Under Vitest, each test file runs with an isolated environment (fresh
// `globalThis`), so this does not leak state across test files.

const REGISTRY = Symbol.for("medibyte.inMemoryStores");

type Registry = Map<string, unknown>;

function registry(): Registry {
  const g = globalThis as typeof globalThis & { [REGISTRY]?: Registry };
  if (!g[REGISTRY]) {
    g[REGISTRY] = new Map<string, unknown>();
  }
  return g[REGISTRY];
}

/**
 * Returns a singleton value keyed by `key`, creating it once via `create()` and
 * sharing it across every module instance in the process. Use for module-level
 * in-memory stores that must be shared between API routes and server components.
 */
export function globalSingleton<T>(key: string, create: () => T): T {
  const r = registry();
  if (!r.has(key)) {
    r.set(key, create());
  }
  return r.get(key) as T;
}
