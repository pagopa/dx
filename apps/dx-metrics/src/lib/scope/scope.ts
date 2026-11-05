/**
 * Scope resolution: turning a token payload into the repositories a visitor may
 * see, and clipping what they ask for to that set.
 */

import type { DxMetricsRepository } from "@pagopa/dx-metrics-core/config";
import { dxMetricsConfig } from "@pagopa/dx-metrics-core/config";

import type { DashboardQuery } from "@/lib/query-params";
import { resolveRepositories } from "@/lib/query-params";
import type { ScopePayload } from "@/lib/scope/token";

/**
 * The repositories one visitor may see. `all` distinguishes the full-portfolio
 * scope from a tag scope that happens to cover every repository today; the
 * distinction matters for the surfaces that are only shown in full.
 */
export interface Scope {
  readonly all: boolean;
  readonly repositories: readonly string[];
  readonly tags: readonly string[];
}

const sortedNames = (repositories: readonly DxMetricsRepository[]): string[] =>
  repositories
    .map((repository) => repository.name)
    .sort((left, right) => left.localeCompare(right));

/** The scope a visitor gets from the full-portfolio link. */
export const fullPortfolioScope = (
  configured: readonly DxMetricsRepository[] = dxMetricsConfig.repositories,
): Scope => ({ all: true, repositories: sortedNames(configured), tags: [] });

/**
 * Keeps the requested repositories the scope actually allows, preserving the
 * caller's order. Requesting more than the scope allows is not an attack worth
 * failing on — the sidebar carries the previous query string across pages, so a
 * narrower link must keep working — and the result can only ever contain
 * visible repositories.
 */
export const intersectScope = (
  requested: readonly string[],
  scope: Scope,
): string[] => {
  const visible = new Set(scope.repositories);
  return [
    ...new Set(requested.filter((repository) => visible.has(repository))),
  ];
};

/**
 * Resolves a payload against the current configuration. Returns `null` when the
 * payload names a tag nobody carries: a tag disappears only when it is removed
 * from the configuration, which is a revocation, and a link that stays valid
 * with an empty scope would surface as unexplainable blank dashboards.
 */
export const resolveScope = (
  payload: ScopePayload,
  configured: readonly DxMetricsRepository[] = dxMetricsConfig.repositories,
): null | Scope => {
  if ("all" in payload) {
    return fullPortfolioScope(configured);
  }

  const knownTags = new Set(
    configured.flatMap((repository) => repository.tags),
  );
  if (payload.tags.some((tag) => !knownTags.has(tag))) {
    return null;
  }

  const wanted = new Set(payload.tags);
  return {
    all: false,
    repositories: sortedNames(
      configured.filter((repository) =>
        repository.tags.some((tag) => wanted.has(tag)),
      ),
    ),
    tags: [...payload.tags],
  };
};

/**
 * The repositories a request may actually query: what the URL asked for, kept
 * only where the scope allows it, defaulting to the whole scope when the URL
 * asks for nothing.
 */
export const resolveVisibleRepositories = (
  query: DashboardQuery,
  scope: Scope,
): string[] => {
  const requested = resolveRepositories(query, scope.repositories);
  const visible = intersectScope(requested, scope);

  // The sidebar carries the previous query string across pages, so a narrower
  // link can inherit repository names its visitor may no longer see. Dropping
  // them keeps navigation working; the warning keeps the case visible in the
  // logs, because it is also what a probing client looks like.
  const uniqueRequested = new Set(requested);
  if (visible.length !== uniqueRequested.size) {
    console.warn(
      `Scope dropped ${uniqueRequested.size - visible.length} of ${uniqueRequested.size} requested repositories`,
    );
  }

  return visible;
};
