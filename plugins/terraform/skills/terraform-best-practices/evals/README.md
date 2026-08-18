# Terraform Skill Evals

`evals.json` is the canonical Agent Skills evaluation manifest. `rubric.md` defines the cross-prompt scoring gates.

The suite intentionally contains only `terraform-best-practices` behavior. Diagram generation and module migration belong to their owning skill or command eval suites.

## Validate the Manifest

```bash
./scripts/validate-evals.sh
```

Use `--strict-files` to require every context-dependent eval to include a valid scaffold:

```bash
./scripts/validate-evals.sh --strict-files
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
./scripts/scaffold-eval.sh prefer-dx-storage-module /tmp/tf-eval-storage
```

The script:

1. Copies the selected base and overlay files into their repository-relative paths.
2. Refuses a non-empty destination or duplicate target path.
3. Initializes Git and commits the untouched fixture as the comparison baseline.
4. Prints the eval prompt and the current `DX_KB_PATH` status.

It does not invoke the DX CLI, Terraform, GitHub, Azure, or any network service.

Scaffold source files live under `evals/scaffolds/`. See `evals/scaffolds/README.md` for the composition contract.

## Run Evals

Run the complete suite without interactive input:

```bash
./scripts/run-evals.sh
```

Run one case while developing:

```bash
./scripts/run-evals.sh --eval explicit-use-case-decision
```

The runner automatically:

1. Resolves `DX_KB_PATH`, using the current DX checkout, `~/.dx`, or a shallow clone.
2. Builds isolated plugin wrappers for the current skill and its previous committed version.
   The wrappers include the Key Vault and Technology Radar skills when available.
3. Materializes fresh current and baseline repositories.
4. Invokes Copilot CLI non-interactively with the same model, reasoning effort, restricted tool set, and disabled MCP servers.
5. Resumes the same session with a scripted answer when an eval defines `follow_up`.
6. Captures responses, tool requests, Git diffs, validation evidence, telemetry, duration, and token usage.
7. Runs a separate isolated grader against every assertion and rubric gate.
8. Produces `summary.json` and `summary.md` with pass rates, cost indicators, winners, regressions, and recurring guardrail failures.

The default artifact location is `/tmp/terraform-best-practices-evals/<timestamp>`. The command exits unsuccessfully when a current-skill eval or automated grade fails.

Use `--dry-run` to prepare every plugin and workspace without spending AI credits:

```bash
./scripts/run-evals.sh --dry-run
```

The previous committed `SKILL.md` version is selected from Git history. When history is unavailable, the baseline runs without the skill. Override the baseline only when reproducing a specific comparison:

```bash
./scripts/run-evals.sh --baseline-ref <git-ref>
```

An authenticated Copilot CLI session is required before starting. Once launched, the suite requires no user interaction.
