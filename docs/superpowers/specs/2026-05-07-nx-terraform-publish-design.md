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
- `github.owner` should be centralized at plugin level and overridable per module.
- Version ownership is delegated to Nx Release integration (to be finalized later).
- Publishable modules are tagged as `terraform:public` for Nx project selection.
- Invalid `module.json` files are skipped from publish inference but logged as
  structured JSON through the package logger.

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
- Discovery logs invalid manifests with a compact JSON Lines record:
  - message: `Invalid manifest file`
  - properties: `{ path, issues }`
- Human-readable validation detail stays available through the error message, but
  it is not duplicated in the structured log payload.

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

Resolution precedence:

1. `module.json.github.owner` (if set)
2. plugin `publish.github.owner`
3. fail with explicit configuration error

### 3. Publish execution engine

Implement a plugin-owned publish executor/service invoked by `nx-release-publish` command wiring.

Responsibilities:

1. Consume module metadata from executor inputs/options:
   - inferred target execution: metadata is injected from discovery,
   - direct executor invocation: caller must provide metadata explicitly.
2. Build repo coordinates (`org`, `repo`).
3. Ensure target repo exists (create if missing).
4. Perform subtree-based synchronization preserving current history semantics.
5. Push resulting branch/content to remote `main`.
6. Keep executor input contract explicit: no implicit fallback read for direct
   calls; missing required metadata in options is a hard error.

This replaces workflow shell orchestration as primary implementation point.

## Publish Flow (`github` mode)

For each eligible module:

1. Parse and validate `module.json`.
2. Resolve organization and repository identity.
3. Check repository existence via GitHub API.
4. If missing, create repository.
5. Configure git remote.
6. Run subtree split from `infra/modules/<module>`.
7. Fetch remote `main` and merge preserving unrelated-history compatibility as current flow does.
8. Push aligned content to remote `main`.
9. Keep release/tag semantics compatible with Nx Release ownership (version source remains Nx Release flow).

End condition: destination repo `main` matches module subtree content and history policy.

## Repo Naming

Use existing naming convention compatibility:

- `terraform-<provider>-<module-name>`

Provider resolution is explicit to avoid ambiguity:

1. `module.json.provider` (required)

## Error Handling

Hard-fail (no silent fallback) with actionable messages for:

1. Invalid/missing `module.json` on inferred publish target path.
2. Missing/invalid `module.json.provider`.
3. Unresolved GitHub owner.
4. GitHub repository creation failure (permission/conflict/rate limit).
5. Git remote/subtree/push failures.

Eligibility errors prevent target inference; execution errors fail the target.
Manifest inference failures are also emitted as structured logger warnings so CI
and local runs can inspect the raw issue list programmatically.

## Testing Strategy

1. **Options/Schema tests**
   - Validate publish config parsing (`mode`, `publish.github.owner`).
2. **Inference tests**
    - `library + valid module.json` => includes `nx-release-publish`.
    - `library + missing/invalid module.json` => excludes target.
    - `library + module.json missing provider` => excludes target.
    - malformed JSON or schema-invalid manifest never marks a module as publishable.
    - invalid manifest discovery warning uses message `Invalid manifest file`
      with `{ path, issues }` properties only.
    - `application` => excludes target.
    - `library + valid module.json` => includes `terraform:public` tag.
3. **Resolution tests**
   - `module.json.github.owner` overrides plugin default.
   - plugin default is used when module override absent.
   - missing both => explicit error.
4. **Publish service tests**
   - repository exists path;
   - repository auto-create path;
   - failure propagation for API/git failures.
5. **Regression tests**
   - Existing targets remain unchanged for non-publish concerns.

## Migration and Rollout

1. Add plugin support while keeping existing workflow in place during transition.
2. Validate output parity against current `_release-bash-modules-to-subrepo` behavior.
3. Switch CI release pipeline to use Nx target orchestration once parity is confirmed.
4. Retire deprecated workflow after successful rollout.

## Open Follow-up

1. Formalize Nx Release handoff for manifest version bump/update ownership and exact interface contract.
