# Terraform Skill Evals

`evals.json` is the canonical Agent Skills evaluation manifest. `rubric.md` defines the cross-prompt scoring gates. The reusable TypeScript runner lives in `packages/skill-evals`.

The suite intentionally contains only `terraform-best-practices` behavior. Diagram generation and module migration belong to their owning skill or command eval suites.

## Validate the Manifest

```bash
pnpm nx run @pagopa/skill-evals:validate -- \
  --skill plugins/terraform/skills/terraform-best-practices
```

Use `--strict-files` to require every context-dependent eval to include a valid scaffold:

```bash
pnpm nx run @pagopa/skill-evals:validate -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --strict-files
```

The validator checks:

- manifest structure and unique IDs/names
- guardrail references and coverage
- referenced fixture files
- unresolved prompt placeholders
- context-dependent prompts that still need fixtures

## Materialize a Repository Fixture

Build one disposable consumer repository from the shared Azure base and the overlays listed in the eval's `files`:

```bash
pnpm nx run @pagopa/skill-evals:scaffold -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --eval prefer-dx-storage-module \
  --output /tmp/tf-eval-storage
```

The runner:

1. Copies the selected base and overlay files into their repository-relative paths.
2. Refuses a non-empty destination or duplicate target path.
3. Initializes Git and commits the untouched fixture as the comparison baseline.
4. Prints the eval prompt and the current `DX_KB_PATH` status.

It does not invoke the DX CLI, Terraform, GitHub, Azure, or any network service. Terraform-specific checks live in `evals/scripts/` and are declared as Vitest-style hooks in `evals.json`.

Scaffold source files live under `evals/scaffolds/`. See `evals/scaffolds/README.md` for the composition contract.

## Skill Hooks

Terraform-specific workspace checks are not part of `@pagopa/skill-evals`. They are declared in `evals.json` with Vitest-style names and live under `evals/scripts/`:

- `after_each` → `evals/scripts/after-each.sh` runs `terraform fmt -check` when `infra/` exists, writes `terraformFormat` into mechanical checks, and deletes `.terraform` caches.

Add `before_all`, `before_each`, or `after_all` in the same folder if a future eval needs extra setup or teardown.

## Run Evals

Run the complete suite without interactive input:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices
```

Run one case while developing:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --eval explicit-use-case-decision
```

The shared runner automatically:

1. Resolves `DX_KB_PATH`, using the current DX checkout, `~/.dx`, or a shallow clone.
2. Builds isolated plugin wrappers for the current skill and its previous committed version.
   The wrappers include the Key Vault and Technology Radar skills when available.
3. Materializes fresh current and baseline repositories.
4. Invokes Copilot CLI non-interactively with the same model, reasoning effort, restricted tool set, and disabled MCP servers.
5. Resumes the same session with a scripted answer when an eval defines `follow_up`.
6. Runs the skill `after_each` hook (`evals/scripts/after-each.sh`) for `terraform fmt -check` and `.terraform` cleanup, then captures responses, tool requests, Git diffs, deterministic mechanical checks, telemetry, duration, token usage, and Copilot AI credits.
7. Runs one separate isolated LLM grader per eval against both variants and retries invalid grader output once.
8. Produces `summary.json` and `summary.md` with pass rates, cost indicators, winners, regressions, and recurring guardrail failures.

The default artifact location is under `/tmp/skill-evals/terraform-best-practices/`. The command exits unsuccessfully when a current-skill eval, deterministic execution constraint, or automated grade fails, so no interactive input or additional CI wrapper is required.

Use `--dry-run` to prepare every plugin and workspace without spending AI credits:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --dry-run
```

The previous committed `SKILL.md` version is selected from Git history. When history is unavailable, the baseline runs without the skill. Override the baseline only when reproducing a specific comparison:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --baseline-ref <git-ref>
```

An authenticated Copilot CLI session is required before starting. Once launched, the suite requires no user interaction.
