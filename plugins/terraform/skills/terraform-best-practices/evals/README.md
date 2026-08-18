# Terraform Skill Evals

`evals.json` is the canonical Agent Skills evaluation manifest. `rubric.md` defines the cross-prompt scoring gates.

The suite intentionally contains only `terraform-best-practices` behavior. Diagram generation and module migration belong to their owning skill or command eval suites.

## Validate the Manifest

```bash
./scripts/validate-evals.sh
```

Use `--strict-files` to fail while a context-dependent eval marked with `fixture_required` has no fixture:

```bash
./scripts/validate-evals.sh --strict-files
```

The validator checks:

- manifest structure and unique IDs/names
- guardrail references and coverage
- referenced fixture files
- unresolved prompt placeholders
- context-dependent prompts that still need fixtures

## Run Evals

Run every case in an isolated disposable repository:

1. Run once with this skill.
2. Run once without the skill or with a snapshot of the previous version.
3. Grade every assertion with concrete evidence.
4. Record duration and token usage.
5. Compare pass rate, cost, and recurring failure patterns.

Use scripts only for mechanical assertions such as file existence, forbidden Terraform patterns, formatting, or validation status. Keep trade-off quality and question relevance under rubric-based review.
