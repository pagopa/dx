# Nx Terraform Plugin — `nx-release-publish` Design

## Context

We want to enhance `@pagopa/nx-terraform-plugin` to support publishing Terraform modules to dedicated GitHub repositories, replacing the current behavior implemented in `.github/workflows/_release-bash-modules-to-subrepo.yaml`.

Current constraints and decisions:

- Publish target name must be `nx-release-publish` (Nx Release alignment).
- Target is only inferred for Terraform projects with `projectType: "library"`.
- A module is publishable only when a dedicated `module.json` manifest exists.
- `module.json` (minimum) requires `version`, `description`, and `provider`.
- Publish mode initially supports only `github`.
- Repository creation is always attempted when the target repository does not exist.
- `github.owner` should be centralized at plugin level and overridable per module,
  but the final merged publish configuration must always provide it.
- Version ownership is delegated to Nx Release integration (to be finalized later).
- Publishable modules are tagged as `terraform:public` for Nx project selection.
- Invalid `module.json` files are skipped from publish inference but logged as
  structured JSON through the package logger.
- LogTape configuration is exposed from `src/logger.ts` through a shared
  `configureLogger()` helper so both project discovery and the publish executor
  can initialize structured logging before emitting records.
- `module.json` is consumer-facing and should have a generated JSON Schema
  artifact derived from the Zod manifest schema.

## Goals

1. Infer `nx-release-publish` only for eligible Terraform module libraries.
2. Replace workflow-centric subrepo publishing logic with plugin-managed logic reusable in local and CI execution.
3. Preserve current subrepo synchronization behavior (module content alignment in target repo).
4. Add first-class GitHub organization resolution (`plugin default` + `module override`).
5. Support automatic repository creation when missing.

## Non-Goals (for first iteration)

1. Multi-platform publishing modes beyond GitHub.
2. Changing Nx Release versioning flow in this phase.
3. Provider publishing redesign (`providers/**`) in this phase.
4. Replacing runtime Zod validation with JSON Schema validation.

## Architecture

### 1. Target inference

`@pagopa/nx-terraform-plugin` extends target generation for Terraform projects:

- Keep existing project discovery/classification.
- Add inferred target `nx-release-publish` only if:
  - project is a Terraform `library`, and
  - `{projectRoot}/module.json` exists and validates.
- Publishable libraries inferred by this rule also receive tag `terraform:public`.
- When `module.json` is discovered, it is immediately read and parsed; only valid
  parsed manifests are considered publishable and carried forward in discovery state.
- Project creation should receive the parsed manifest payload (or `undefined`)
  instead of a boolean publishability flag.

Projects without valid manifest remain internal libraries and do not expose the publish target.

### 1.1 Manifest validation and discovery logging

- Manifest parsing raises a typed `ModulePublishManifestError`.
- The error keeps the raw Zod issue objects on `issues`, using
  `z.core.$ZodIssue[]` instead of the deprecated `ZodIssue` alias.
- `src/logger.ts` exposes both `getPackageLogger(...)` and
  `configureLogger()`, centralizing LogTape configuration with the JSON Lines
  formatter.
- Discovery logs invalid manifests with a compact JSON Lines record:
  - message: `Invalid manifest file`
  - properties: `{ path, issues }`
- Discovery and publish execution explicitly call `configureLogger()` before
  emitting logs; helper modules still avoid inlining LogTape configuration.
- Human-readable validation detail stays available through the error message,
  but it is not duplicated in the structured log payload.

### 1.2 Consumer manifest schema generation

- `modulePublishManifestSchema` remains the single source of truth.
- The package should expose a generated `module.schema.json` file for consumers
  that want to validate or autocomplete `module.json`.
- Generation stays minimal:
  - generator file: `packages/nx-terraform-plugin/src/generate-module-schema.ts`
  - package script: `generate`
  - output file: `packages/nx-terraform-plugin/module.schema.json`
- The generator script imports the Zod manifest schema, converts it through
  Zod's JSON Schema API, extends that generated schema in-script so consumers may
  include an optional top-level `$schema` property, and writes the JSON Schema
  file to disk.
- The Zod manifest schema itself is not widened to support `$schema`; that
  compatibility stays isolated to the generated JSON Schema artifact.
- Runtime plugin behavior continues to validate with Zod directly; the generated
  schema is an external artifact, not a second validation path.

### 2. Configuration model

Plugin-level configuration (new section in plugin options):

```json
{
  "publish": {
    "mode": "github",
    "github": {
      "owner": "pagopa-dx"
    }
  }
}
```

Module-level manifest (`{projectRoot}/module.json`):

```json
{
  "version": "1.2.3",
  "description": "Terraform module description",
  "provider": "aws",
  "github": {
    "owner": "optional-module-specific-org"
  }
}
```

Schema model:

1. **Publish schema (source of truth)**  
   Required final shape used for actual publishing:
   - `description`
   - `version`
   - `provider`
   - `github.owner`
2. **Plugin publish options schema**  
   Derived from the publish schema with `pick({ github: true })`, then relaxed so
   `github.owner` stays optional. This schema validates only plugin-level defaults.
3. **Module manifest schema**  
   Derived from the same publish schema while keeping `description`, `version`,
   and `provider` required, but relaxing `github.owner` so a module can rely on
   the plugin default.

Merge and validation flow:

1. Parse plugin publish defaults with the plugin publish options schema.
2. Parse `module.json` with the module manifest schema.
3. Merge plugin defaults with manifest values, with manifest values overriding the
   plugin defaults.
4. Validate the merged result against the required publish schema.
5. Only modules whose merged publish options pass this validation are treated as
   publishable.

Warning behavior for invalid merged publish options:

- message: `Invalid publish options`
- properties: `{ path, issues }`
- effect during inference: skip `nx-release-publish` target generation

The executor also revalidates its final input through a dedicated
`nxReleasePublishExecutorSchema` derived from the publish schema, so
`githubOwner` is never treated as optional at execution time while
`workspaceRoot` remains compatible with the raw string value Nx passes in.

### 3. Publish execution engine

Implement a plugin-owned publish executor/service invoked by `nx-release-publish` command wiring.

Responsibilities:

1. Consume validated publish metadata from executor inputs/options:
   - inferred target execution: metadata is injected from discovery,
   - direct executor invocation: caller must provide metadata explicitly.
2. Build repo coordinates (`org`, `repo`).
3. Ensure target repo exists (create if missing).
4. Perform subtree-based synchronization preserving current history semantics.
5. Push resulting branch/content to remote `main`.
6. Keep executor input contract explicit: no implicit fallback read for direct
   calls; missing required metadata in options is a hard error.

This replaces workflow shell orchestration as primary implementation point.
Concrete integrations should stay out of the flat `src/` root:

- `src/executors/publish/publish.ts` stays as the thin Nx boundary
- `src/adapters/github/publisher.ts` owns the GitHub-mode publish orchestration
- `src/adapters/github/octokit.ts` owns direct GitHub API calls (Octokit)
- avoid extra runtime factories or transport interfaces when simple direct adapter
  functions are enough

## Publish Flow (`github` mode)

For each eligible module:

1. Parse and validate `module.json`.
2. Merge plugin publish defaults with manifest values.
3. Validate the merged result against the required publish schema.
4. Resolve organization and repository identity from the validated merged options.
5. Check repository existence via GitHub API.
6. If missing, create repository.
7. Configure git remote.
8. Run subtree split from `infra/modules/<module>`.
9. Fetch remote `main` and merge preserving unrelated-history compatibility as current flow does.
10. Push aligned content to remote `main`.
11. Keep release/tag semantics compatible with Nx Release ownership (version source remains Nx Release flow).

End condition: destination repo `main` matches module subtree content and history policy.

## Repo Naming

Use existing naming convention compatibility:

- `terraform-<provider>-<module-name>`

Provider resolution is explicit to avoid ambiguity:

1. `module.json.provider` (required)

## Error Handling

Hard-fail (no silent fallback) with actionable messages for:

1. Invalid/missing `module.json` on inferred publish target path.
2. Invalid merged publish options (including missing final `github.owner`).
3. GitHub repository creation failure (permission/conflict/rate limit).
4. Git remote/subtree/push failures.

Eligibility errors prevent target inference; execution errors fail the target.
Manifest inference failures and merged publish option failures are also emitted
as structured logger warnings so CI and local runs can inspect the raw issue
list programmatically.

## Testing Strategy

1. **Options/Schema tests**
   - Validate publish config parsing (`mode`, `publish.github.owner`).
   - Validate JSON Schema generation from the Zod manifest schema.
   - Validate that the generated `module.schema.json` accepts an optional
     top-level `$schema` property without changing the runtime Zod manifest
     validator.
2. **Inference tests**
     - `library + valid module.json` => includes `nx-release-publish`.
     - `library + missing/invalid module.json` => excludes target.
     - `library + module.json missing provider` => excludes target.
     - malformed JSON or schema-invalid manifest never marks a module as publishable.
     - invalid manifest discovery warning uses message `Invalid manifest file`
       with `{ path, issues }` properties only.
     - valid manifest + missing owner in both manifest and plugin defaults =>
       warning `Invalid publish options` with `{ path, issues }`, and no publish
       target.
     - `application` => excludes target.
     - `library + valid module.json` => includes `terraform:public` tag.
3. **Resolution tests**
     - `module.json.github.owner` overrides plugin default.
     - plugin default is used when module override absent.
     - missing both => merged publish validation failure.
4. **Publish service tests**
    - repository exists path;
    - repository auto-create path;
    - failure propagation for API/git failures.
5. **Regression tests**
    - Existing targets remain unchanged for non-publish concerns.
    - executor rejects invalid final publish options instead of silently treating
      `githubOwner` as optional.

## Migration and Rollout

1. Add plugin support while keeping existing workflow in place during transition.
2. Validate output parity against current `_release-bash-modules-to-subrepo` behavior.
3. Record release notes with `pnpm nx release plan` instead of editing
   `CHANGELOG.md` directly; Nx Release pipelines remain the single writer for
   changelog updates and version bumps.
4. Switch CI release pipeline to use Nx target orchestration once parity is confirmed.
5. Retire deprecated workflow after successful rollout.

## Open Follow-up

1. Formalize Nx Release handoff for manifest version bump/update ownership and
   exact interface contract, including the version-plan wording expected for
   Terraform module publish support.
