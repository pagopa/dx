# Nx Terraform Plugin — `nx-release-publish` Design

## Context

We want to enhance `@pagopa/nx-terraform-plugin` to support publishing Terraform modules to dedicated GitHub repositories, replacing the current behavior implemented in `.github/workflows/_release-bash-modules-to-subrepo.yaml`.

Current constraints and decisions:

- Publish target name must be `nx-release-publish` (Nx Release alignment).
- Target is only inferred for Terraform projects with `projectType: "library"`.
- A module is publishable only when a dedicated `module.json` manifest exists.
- `module.json` (minimum) requires `version`, `description`, and `provider`.
- `module.json.version` must be a valid semver string, including support for
  prerelease and build metadata.
- Publish mode initially supports only `github`.
- Repository creation is always attempted when the target repository does not
  exist, for both GitHub organizations and personal user profiles.
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
3. Align the target repository to an exact snapshot of the module directory, without requiring history preservation.
4. Add first-class GitHub owner resolution (`plugin default` + `module override`)
   for both organizations and personal profiles.
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
- `manifest.ts` should define a reusable `semverSchema` with Zod's string-format
  support and back it with the `semver` package, so the manifest version field is
  validated by real semver parsing instead of an ad-hoc regex.
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

Version validation rule:

- `modulePublishManifestSchema.version` must use `semverSchema`, not a generic
  string validator.
- Accepted values include standard semver releases plus prerelease/build metadata
  (for example `1.2.3`, `1.2.3-beta.1`, `1.2.3+build.7`).
- Non-semver values such as partial versions, arbitrary strings, or prefixed
  forms like `v1.2.3` are invalid at runtime.

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
2. Build repo coordinates (`owner`, `repo`).
3. Ensure target repo exists (create if missing).
4. Perform snapshot-based export from the module directory into a temporary publish repository.
5. Force-push the resulting snapshot to remote `main` and a version tag to the destination repo.
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
4. Resolve owner and repository identity from the validated merged options.
5. Check repository existence via GitHub API.
6. If missing, resolve whether the owner is a GitHub organization or user profile.
7. Create the repository with the matching Octokit API:
   - organization => `repos.createInOrg`
   - user profile => `repos.createForAuthenticatedUser`
8. When the owner is a user profile, fail explicitly if it does not match the
   authenticated GitHub user because GitHub does not allow creating repos for an
   arbitrary user account.
9. Create a temporary directory outside the workspace.
10. Initialize a fresh git repository there on branch `main`.
11. Copy the current filesystem contents of `infra/modules/<module>` into that
    temporary repository root, treating the exported repo as an exact snapshot of
    the module directory rather than a history-preserving mirror.
12. Create a single publish commit such as `Updated module`, using explicit commit
    metadata so the flow does not depend on local git config.
13. Create or update a local git tag named exactly as `module.json.version`, pointing
    to that snapshot commit.
14. Configure the GitHub remote in the temporary repository.
15. Force-push the snapshot commit to remote `main`.
16. Force-push the version tag to the destination repository, overwriting any
    existing remote tag with the same name.
17. Remove the temporary directory in best-effort mode after success or failure.
18. Keep release/tag semantics compatible with Nx Release ownership (version source remains Nx Release flow).

End condition: destination repo `main` matches the current module directory snapshot, and the tag named after `module.json.version` points to that same exported snapshot commit.

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
4. Requested user-profile owner does not match the authenticated GitHub user.
5. Temporary repo init/copy/commit/tag/remote/push failures.
6. Best-effort temporary-directory cleanup failures should not hide an earlier primary publish failure;
   if cleanup is the only failing step after a successful publish, surface it
   explicitly.

Eligibility errors prevent target inference; execution errors fail the target.
Manifest inference failures and merged publish option failures are also emitted
as structured logger warnings so CI and local runs can inspect the raw issue
list programmatically.

### Publish command execution style

- `src/adapters/github/publisher.ts` should use Execa's tagged-template `$` API as
  the default command interface for git operations so orchestration reads like the
  shell flow it represents.
- When publish uses `$` to create the snapshot commit in the temporary export
  repository, configure it with `shell: true` so the quoted commit message path
  works reliably in this environment.
- When the flow needs to branch on exit status instead of throwing immediately
  (for example, probing optional cleanup steps), it should still use a
  configured `$` variant with non-throwing behavior rather than dropping to raw
  `execa`, unless a lower-level call is explicitly documented as necessary.
- Prefer naming that configured variant `safe$` and derive it from the same base
  command configuration as `$`, so the non-throwing path keeps the same working
  directory and other shared settings while making its intent explicit.

## Testing Strategy

1. **Options/Schema tests**
   - Validate publish config parsing (`mode`, `publish.github.owner`).
   - Validate JSON Schema generation from the Zod manifest schema.
   - Validate that the generated `module.schema.json` accepts an optional
      top-level `$schema` property without changing the runtime Zod manifest
      validator.
   - Validate that `module.json.version` accepts valid semver strings including
     prerelease/build metadata and rejects invalid semver values.
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
     - organization repository auto-create path;
     - user-profile repository auto-create path;
      - explicit failure when user-profile owner differs from the authenticated user;
      - repeated publish invocations do not fail because publish state is isolated
        in a temporary export repository;
      - the publish force-pushes an exact module snapshot to `main`, deleting
        files that no longer exist in the module directory;
      - the publish creates or updates a tag named after `module.json.version`
        and force-pushes it to the destination repository;
      - tag-push failure fails the publish even if the branch push already
        succeeded;
      - the temporary export repository is removed in best-effort cleanup after
        success and after mid-flow failures;
      - publish can run from a dirty workspace because it does not check out
        branches or mutate workspace git state;
      - failure propagation for API/git failures.
5. **Regression tests**
    - Existing targets remain unchanged for non-publish concerns.
    - executor rejects invalid final publish options instead of silently treating
      `githubOwner` as optional.

## Migration and Rollout

1. Add plugin support while keeping existing workflow in place during transition.
2. Validate content parity against current `_release-bash-modules-to-subrepo` behavior, while allowing the new flow to replace subtree history with snapshot commits.
3. Record release notes with `pnpm nx release plan` instead of editing
   `CHANGELOG.md` directly; Nx Release pipelines remain the single writer for
   changelog updates and version bumps.
4. Switch CI release pipeline to use Nx target orchestration once parity is confirmed.
5. Retire deprecated workflow after successful rollout.

Release verification note:

- End-to-end verification should use a real publishable sample module under
  `infra/modules/aws_azure_vpn`.
- The verification manifest may be created as part of the task if it is missing,
  so the rollout step stays reproducible across branches and clean worktrees.
- The verification owner should be a personal GitHub account (`lucacavallaro`)
  rather than a production organization, to avoid accidental repository creation
  under shared orgs during live testing.
- With the current naming rule, the expected destination repository is
  `lucacavallaro/terraform-aws-aws-azure-vpn`.

## Open Follow-up

1. Formalize Nx Release handoff for manifest version bump/update ownership and
   exact interface contract, including the version-plan wording expected for
   Terraform module publish support.
