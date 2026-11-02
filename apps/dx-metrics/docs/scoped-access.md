# Scoped access to repositories

Design for per-visitor repository visibility in the DX Metrics portal. The
decision and its alternatives are recorded in
[`docs/adr/0001-repository-scopes.md`](./adr/0001-repository-scopes.md); this
document covers the model, the rules, and the work.

Terms (`Portfolio`, `Tag`, `Scope`, `Magic link`) are defined in
[`GLOSSARY.md`](../GLOSSARY.md).

## Model

A repository carries one or more tags. A magic link carries a set of tags (or
the full-portfolio marker), and the scope of a visitor is the union of the
repositories carrying any of those tags:

```
scope(link) = { r ∈ portfolio | r.tags ∩ link.tags ≠ ∅ }
```

Consequences worth stating explicitly:

- Tags may overlap: a repository tagged `one` and `pdv` is visible to both
  scopes.
- A repository with no tag is visible to nobody. That is a configuration bug,
  not a valid state, so the build fails instead.
- The full portfolio is a scope, not the absence of one. There is no visitor
  without a scope.

### Tag vocabulary

| Tag        |   # | Repositories                                 |
| ---------- | --: | -------------------------------------------- |
| `bb`       |  10 | `onemail`, `oneidentity`, all `pdv-*`        |
| `dx`       |   1 | `dx`                                         |
| `idpay`    |  18 | all `idpay-*` plus all `cstar-*`             |
| `io`       |  14 | all `io-*` plus `wallet-conformance-test`    |
| `p4pa`     |  20 | all `p4pa-*`                                 |
| `pagopa`   |   9 | all `pagopa-*`                               |
| `pdnd`     |   6 | all `interop-*` plus `pdnd-interop-frontend` |
| `plsm`     |   1 | `plsm-service-management`                    |
| `pn`       |  29 | all `pn-*`                                   |
| `portals`  |   2 | `b2b-portals`, `developer-portal`            |
| `selfcare` |   2 | `selfcare`, `selfcare-infra`                 |

112 repositories, no repository untagged. Scopes compose by union, so a single
link can span programmes: `--tags bb,pn` covers thirty-nine repositories.

## What this protects

The portal already sits behind Entra ID authentication on the Azure Container
App, so reaching the domain means being an authenticated PagoPA user. The scope
adds a second question on top of that: _which repositories may this visitor
see_. It protects against a colleague from another programme reading metrics
they were never given, not against an anonymous attacker — there aren't any.

Two limits are accepted, not overlooked:

- **A link is a shared credential.** Anyone the holder forwards it to sees the
  same scope. There is no per-person identity, so there is nothing finer to
  enforce or revoke.
- **The signing secret mints any scope.** Whoever reads
  `DX_METRICS_SCOPE_SECRET` from Key Vault can produce a full-portfolio link.
  It is the highest-value secret in the app.

## Token

```
body  = base64url(JSON.stringify(payload))
token = body + "." + base64url(HMAC-SHA256(secret, body))
```

Payload, one of:

```jsonc
{ "v": 1, "tags": ["p4pa"] } // tags sorted before signing
{ "v": 1, "all": true }
```

Rules:

- Tags are sorted before serialisation, so a set always yields the same link.
- Verification: split, recompute the HMAC, compare with `timingSafeEqual`,
  parse, check `v === 1`, then resolve tags against the current configuration.
- A tag that no longer exists makes the token invalid. Opening such a link
  lands on `/access` with a generic message; a request carrying it in its cookie
  gets a `401`. A tag disappearing is a revocation, and a "valid but empty"
  scope would surface as blank dashboards nobody can explain.
- The link itself never expires. Opening it installs a cookie that lasts seven
  days, after which the visitor has to open the link again. Revocation is
  rotating the secret, which invalidates every link in circulation.

## Configuration shape

`packages/dx-metrics-core/src/config.ts` currently exposes
`repositories: readonly string[]`. It becomes:

```ts
export interface DxMetricsRepository {
  readonly name: string;
  readonly tags: readonly string[];
}

export interface DxMetricsConfig {
  readonly dxRepo: string;
  readonly dxTeamSlug: string;
  readonly organization: string;
  readonly repositories: readonly DxMetricsRepository[];
}
```

`defaultImportFileConfig.repositories` keeps its `string[]` type for the
importer and is derived with `.map((repository) => repository.name)`.

The portal test suite (`apps/dx-metrics/src/lib/__tests__/config.test.ts`)
asserts that names are unique, that every repository carries at least one tag,
that tags match `^[a-z0-9][a-z0-9-]*$` and are not repeated on a repository, and
that the tag vocabulary is the expected closed set. The shared package has no
test target of its own, and adding one for a single test would duplicate the
whole harness; the portal is where tags are consumed.

Resolution lives in `apps/dx-metrics/src/lib/scope/scope.ts`:

- `resolveScope(payload)` — union of the payload's tags, sorted, or `null` for
  an unknown tag.
- `fullPortfolioScope()` — the `all: true` scope.
- `intersectScope(requested, scope)` — what the visible set allows.
- `resolveVisibleRepositories(query, scope)` — the whole request-side rule.

`DEFAULT_REPOSITORY` and the sorted `REPOSITORIES` export are gone: the default
is the whole scope, and the visible list is per-visitor.

## Request lifecycle

Server, per request:

1. `resolveScopeFromToken(token)` verifies the token and resolves it to
   `{ all, tags, repositories }`. `resolveActiveScope(token)` adds the rollout
   fallback and is what pages and routes use.
2. `requireScope(req)` turns `null` into a `401`; `requireFullScope(req)` turns
   `!all` into a `403`, used by DX Team.
3. Routes clip the requested repositories to the scope:

```ts
const visible = resolveVisibleRepositories(parsed.query, auth.scope);
```

Intersect, not reject: the sidebar carries the previous query string across
pages, so a visitor who opens a narrower link inherits URLs naming repositories
they can no longer see. Dropping them silently (and logging a warning) keeps the
navigation working; returning `403` would break it for no security gain, since
the response can only ever contain visible repositories anyway.

An explicitly empty selection stays empty — the existing "empty selection means
no data" semantics are preserved. A request whose selection is entirely outside
the scope (a stale sidebar URL carried across a link switch) ends up empty, not
replaced by the scope: logging the drop is what makes the case diagnosable.

Client, per page:

- `dashboards/layout.tsx` resolves the scope server-side and renders
  `ScopeProvider` with `{ all, repositories }`.
- `useDashboardFilters` reads the context instead of importing
  `REPOSITORIES`/`DEFAULT_REPOSITORY`; the default selection becomes the whole
  scope.
- `DashboardFilters` reads the context for the select options.
- `Sidebar` hides DX Team when the scope is restricted.

No proxy (Next 16's name for middleware — the app currently has none): the pages
are server components that already read cookies, every data path goes through a
route handler, and half the enforcement would still be missing from a proxy that
cannot pass the scope to the SQL layer. The Next.js docs say the same: proxy is
for optimistic checks, not for authorization.

The entry redirect is built from the `Host` and `X-Forwarded-Proto` headers, not
from `req.nextUrl.origin`: the standalone server starts with
`HOSTNAME=0.0.0.0`, so the request's own origin describes the container's
address rather than the domain the visitor used.

## Disclosure matrix

| Surface                                                         | Restricted scope                                                    | Full scope        |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------- |
| Pull Requests, PR Reviews, Workflows, Copilot, IaC, DX Adoption | filtered                                                            | filtered (no-op)  |
| Overview insights                                               | same, with DX Team skipped                                          | all sources       |
| Benchmark                                                       | peers = scope                                                       | peers = portfolio |
| Techradar                                                       | rows and denominator = scope; **usage trend hidden**                | unchanged         |
| DX Team                                                         | **403**, hidden from the sidebar                                    | unchanged         |
| Tracker                                                         | visible: no repository dimension, only category/priority/timestamps | unchanged         |
| Releases                                                        | visible: public Terraform registry data                             | unchanged         |
| `/api/health`                                                   | open (liveness probe)                                               | open              |

The Techradar trend is hidden because `tech_radar_snapshots` stores per-tool
counts with no repository column: it cannot be filtered without a schema and
importer change, and publishing the org-wide trend inside a narrowed scope would
leak exactly what the scope is meant to hide. Making it scoped is a separate
piece of work.

DX Team is hidden rather than filtered: its queries are org-wide by
construction (`commits` across the organisation, `dx_pipeline_usages` and
`terraform_modules` snapshots without a repository filter, `io-infra` PRs
hard-coded). A scoped DX Team is a different dashboard, not a `WHERE` clause.

## Caching

`DASHBOARD_CACHE_CONTROL` becomes `private, no-store`. A `public, s-maxage`
response is keyed by URL, and the URL no longer determines the payload — the
cookie does, so a shared cache would hand one scope's payload to another
visitor. The client-side 60-second in-memory cache in `useDashboardData`
remains and covers most navigation. Reading the cookie also opts every route out
of static caching automatically.

## Operations

Minting a link, from a machine with the secret in the environment:

```bash
export DX_METRICS_SCOPE_SECRET="$(az keyvault secret show \
  --vault-name dx-p-itn-common-kv-01 \
  --name dx-metrics-scope-secret --query value -o tsv)"

pnpm --filter dx-metrics scope:link --tags p4pa
pnpm --filter dx-metrics scope:link --tags one,pdv   # union
pnpm --filter dx-metrics scope:link --all
```

The script lives in `apps/dx-metrics/scripts/mint-scope-link.ts`. It prints the
resolved scope with its repository count, then the URL — the count is the only
sanity check that the tags mean what you think. It refuses to run against a
missing or short secret and against an unknown tag.

Secret storage: `azurerm_key_vault_secret.scope_secret` in
`infra/resources/_modules/metrics_portal/scope.tf`, using the same
`value_wo = "placeholder"` pattern as `azuread_client_secret` so rotation is a
Key Vault operation rather than a Terraform apply. The value is injected into
the container as `DX_METRICS_SCOPE_SECRET` by `versionless_id`.

Rotation invalidates every link; the procedure is: set a new version of the
secret, restart the Container App revision, redistribute links.

### Rollout

Enforcement is gated by `DX_METRICS_SCOPE_ENFORCE`, default `true` in code and
set to `false` in Terraform for the first deploy. Sequence:

1. Deploy with `DX_METRICS_SCOPE_ENFORCE = "false"`: tags, `/auth/scope`,
   cookie issuance and filtering are live, but a request without a valid scope
   still sees the portfolio.
2. Generate the full-portfolio link and send it to every current user.
3. Delete the `DX_METRICS_SCOPE_ENFORCE = "false"` line: the default enforces.
4. In a follow-up PR, delete the flag and the fail-open branch.

The default is `true` on purpose: a missing variable in production must lock
people out, not open the portfolio. Local development mints its own link.

## Work

Steps 1–8 are implemented. Step 9 is not: until the Key Vault secret exists
the deployed portal cannot verify a single link.

1. **Shared config** — `packages/dx-metrics-core/src/config.ts`: tag the 112
   repositories, change `DxMetricsConfig`, derive `defaultImportFileConfig`;
   validation test; version plan (breaking change to an internal package).
2. **Scope core** — `src/lib/scope/{token,scope,server}.ts`: sign, verify,
   resolve, `resolveScopeFromToken`/`resolveActiveScope`/`requireScope`,
   `intersect`.
3. **Entry point** — `src/app/auth/scope/route.ts` (validate, set cookie,
   redirect, `Referrer-Policy: no-referrer`), `src/app/access/page.tsx`
   (generic "open the link you were given" page, plus an invalid-link variant).
4. **Client wiring** — `src/components/ScopeProvider.tsx`,
   `src/app/dashboards/layout.tsx` (guard + provider), `useDashboardFilters`,
   `DashboardFilters`, `Sidebar`.
5. **Routes** — guard and intersection on the six already-filtered endpoints;
   pass the scope to Benchmark and Techradar; refuse DX Team; complete the
   wiring in `api/dashboards/insights`.
6. **Cache** — `src/lib/api-cache.ts`.
7. **UI consequences** — the Techradar usage trend disappears for restricted
   scopes because the payload carries none; DX Team leaves the sidebar. No empty
   state is needed for an empty scope: every tag resolves to repositories, and
   the configuration test guarantees it.
8. **Minting** — `scripts/mint-scope-link.ts`, `scope:link` script, `tsx` in
   `devDependencies`, README section.
9. **Infra** — `scope.tf` (Key Vault secret), `DX_METRICS_SCOPE_SECRET`,
   `DX_METRICS_SCOPE_ENFORCE`, README runbook.

## Tests

- `scope/token.test.ts` — round trip, determinism across tag order, tampered
  body, tampered signature, wrong secret, malformed base64, unknown version,
  unknown tag, `all` payload.
- `scope/scope.test.ts` — tag union, overlapping tags, empty result, unknown tag
  rejection, intersection with a requested superset, explicit empty selection.
- `dx-metrics-core config` — unique names, non-empty tags, charset.
- Route tests for the 401/403 paths where the existing suite already covers
  routes; otherwise a table-driven test on `requireScope`.
