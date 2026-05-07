# Nx Terraform Plugin — `nx-release-publish` Design

## Context

We want to enhance `@pagopa/nx-terraform-plugin` to support publishing Terraform modules to dedicated GitHub repositories, replacing the current behavior implemented in `.github/workflows/_release-bash-modules-to-subrepo.yaml`.

Current constraints and decisions:

- Publish target name must be `nx-release-publish` (Nx Release alignment).
- Target is only inferred for Terraform projects with `projectType: "library"`.
- A module is publishable only when a dedicated `module.json` manifest exists.
- `module.json` (minimum) requires `version` and `description`.
- Publish mode initially supports only `github`.
- Repository creation is always attempted when the target repository does not exist.
- `github.owner` should be centralized at plugin level and overridable per module.
- Version ownership is delegated to Nx Release integration (to be finalized later).

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

Projects without valid manifest remain internal libraries and do not expose the publish target.

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

1. Resolve module metadata (`module.json`) and defaults.
2. Build repo coordinates (`org`, `repo`).
3. Ensure target repo exists (create if missing).
4. Perform subtree-based synchronization preserving current history semantics.
5. Push resulting branch/content to remote `main`.

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

1. `module.json.provider` (if present)
2. fallback to `"azurerm"` (current workflow default behavior)

## Error Handling

Hard-fail (no silent fallback) with actionable messages for:

1. Invalid/missing `module.json` on inferred publish target path.
2. Unresolved GitHub owner.
3. GitHub repository creation failure (permission/conflict/rate limit).
4. Git remote/subtree/push failures.

Eligibility errors prevent target inference; execution errors fail the target.

## Testing Strategy

1. **Options/Schema tests**
   - Validate publish config parsing (`mode`, `publish.github.owner`).
2. **Inference tests**
   - `library + valid module.json` => includes `nx-release-publish`.
   - `library + missing/invalid module.json` => excludes target.
   - `application` => excludes target.
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
