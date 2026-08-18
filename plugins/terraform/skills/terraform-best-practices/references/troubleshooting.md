# Terraform Skill Troubleshooting

## DX Knowledge Base

If the knowledge base is unavailable, continue with read-only advice but do not generate Terraform without the DX module source and documentation.

Resolve the KB in this order:

1. `DX_KB_PATH`
2. the current checkout when it is `pagopa/dx`
3. `~/.dx`

If none is valid, ask the user to provide a checkout or set `DX_KB_PATH`.

## Validation and Module Locks

Use the authoritative validation and pre-commit documentation selected through [Source Routing](./source-routing.md).

- Run `terraform init -upgrade` after changing module constraints when dependency selection must be refreshed.
- Never edit `.terraform.lock.hcl` manually.
- Prefer the smallest pre-commit invocation covering changed files.
- Report missing credentials or backend access instead of weakening validation.

When a command fails, diagnose the reported error before clearing caches or running repository-wide repair commands.
