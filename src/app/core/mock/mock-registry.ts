import type { MockRoute } from './mock-types';

/** A route found for a request, with the values of its `{name}` segments. */
export interface ResolvedRoute {
  readonly route: MockRoute;
  readonly params: Readonly<Record<string, string>>;
}

interface CompiledRoute {
  readonly route: MockRoute;
  readonly method: string;
  readonly segments: readonly string[];
}

const PARAM = /^\{(\w+)\}$/;

function compile(route: MockRoute): CompiledRoute {
  const [method = '', pattern = ''] = route.key.split(' ');
  return { route, method, segments: pattern.split('/') };
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The params of `segments` against a compiled pattern, or null when the path does not match. */
function matchSegments(
  pattern: readonly string[],
  segments: readonly string[],
): Record<string, string> | null {
  if (pattern.length !== segments.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (const [index, part] of pattern.entries()) {
    const segment = segments[index] ?? '';
    const name = PARAM.exec(part)?.[1];
    const value = name === undefined ? null : decode(segment);
    if (name === undefined && part !== segment) {
      return null;
    }
    if (name !== undefined) {
      if (value === null || value === '') {
        return null;
      }
      params[name] = value;
    }
  }
  return params;
}

/**
 * The handlers of the simulated BFF by method and path of the contract. Each screen adds its own
 * file of routes; two routes with the same key are a mistake and fail when the registry is built.
 */
export class MockRegistry {
  private readonly routes: readonly CompiledRoute[];

  constructor(routes: readonly MockRoute[]) {
    const keys = new Set<string>();
    for (const { key } of routes) {
      if (keys.has(key)) {
        throw new Error(`Mock route registered twice: ${key}`);
      }
      keys.add(key);
    }
    this.routes = routes.map(compile);
  }

  /** The route for `method` and `path` (without query), or null when none is registered. */
  resolve(method: string, path: string): ResolvedRoute | null {
    const segments = path.split('/');
    for (const compiled of this.routes) {
      if (compiled.method !== method.toUpperCase()) {
        continue;
      }
      const params = matchSegments(compiled.segments, segments);
      if (params !== null) {
        return { route: compiled.route, params };
      }
    }
    return null;
  }
}
