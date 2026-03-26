---
name: terraform-best-practices
description: Generate Terraform code following PagoPA DX best practices. Reads DX documentation, enforces module-first usage from the pagopa-dx Registry namespace, discovers module capabilities dynamically, collects required values from the existing workspace, and validates all generated code before presenting it to the user.
---

# Terraform DX Best Practices

> **⚡ Parallelism**: Steps 1, 2, and 7 are independent — launch them in parallel via subagents, then merge results before code generation.

### 1. Load DX Documentation

Clone or update the DX repo, then read all markdown in `.dx/apps/website/docs/terraform/` — the authoritative source.

```bash
if [ ! -d ".dx" ]; then
  git clone --depth 1 https://github.com/pagopa/dx ".dx"
else
  git -C ".dx" pull --ff-only
fi
```

### 2. Search DX Modules Before Writing Any Resource

**Module-first rule**: before writing any `resource` block, check whether a `pagopa-dx/*` module wraps it. This applies to ALL resource types — compute, storage, networking, IAM, monitoring, etc. Never assume a module doesn't exist.

1. **List modules** — scan `.dx/infra/modules/` once to build the full catalogue.
2. **If a module exists**: read its `README.md`, `variables.tf`, `outputs.tf`, `main.tf`, and `examples/`. Pin version from `package.json` with `~> major.minor`. **Use the module instead of raw resources.**
3. **Raw resources only** when no DX module covers the type.

Build a **capability map** from each module's `variables.tf`: optional variables with defaults → capabilities; nested objects → sub-capabilities; `validation` blocks → constraints. Do not rely on hardcoded feature lists — discover dynamically.

> **Secrets**: when handling sensitive values or Key Vault resources, invoke the `azure-keyvault-secret` skill first.

### 3. Collect Configuration

**Mine the workspace first** before asking the user anything:

- **Target folder**: derive from `.dx/apps/website/docs/terraform/infra-folder-structure.md`. Scan existing `.tf` files for: `prefix`, `env_short`, `location`, `domain`, `instance_number`, resource groups, subscription refs, `tags`. Ask the user only if the docs don't clarify the folder.
- **Core-values-exporter**: if any `.tf` file references a `pagopa-dx/*-core-values-exporter/*` module, use its outputs (`module.<name>.<output>`) instead of new `data` sources.

**Code structure** — choose based on scope:

- **Local module** (`infra/resources/_modules/<service>/`): when creating 2+ related resources for one service. Files: `main.tf`, `variables.tf`, `iam.tf`, `outputs.tf`. Instantiate from env folder via `locals.tf` — never add `variables.tf` to root env folders.
- **Inline**: single standalone resource or patch to existing flat pattern.
- If unclear, ask the user.

**Ask only for values not found.** Rules:

- **One question per message** — never bundle multiple values.
- **Offer choices** when valid values are known (e.g., `env_short`: d/u/p; `location`: italynorth/westeurope/spaincentral). Free-form only when no fixed set exists.
- **Module options** (`use_case`, optional capabilities): present a descriptive table from the module docs showing what each option does, its default, and what changes. For each optional capability, explain behavior → default → impact of changing it, then ask.
- **Never assume** project-specific config — if not in the workspace, ask.

### 4. Summarize Planned Changes

Before writing code, briefly present: (1) current state of affected resources, (2) what will be added/modified/removed and why. No full inventory needed.

### 5. Generate Code

Write **complete, working Terraform** — no placeholders, TODOs, or skeleton comments.

**Comments**: for every user-choosable parameter, add an inline comment above it explaining what it controls and what changes if the value changes. Skip comments for mechanical wiring (IDs, standard naming, direct pass-through).

**Auto-wire implicit capabilities** when a higher-level feature requires them:

- Role assignments for identity access
- Managed identity for protected resource access
- Private endpoints / DNS wiring for private patterns
- Write-only secret resources for Key Vault
- Required DX tags
- Explicit `depends_on` where ordering is ambiguous
- `dx_available_subnet_cidr` for every new subnet (never hardcode CIDRs)

Briefly explain any auto-wired capability to the user.

### 6. Validate

Run in the target directory before presenting code:

1. `terraform init` (or `terraform init -backend=false`)
2. `terraform validate` — fix all errors
3. `terraform plan` if backend/credentials available — fix errors
4. Iterate until clean. **Never present code that fails validation.**

> See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common errors.

### 7. Check Technology Radar

Fetch `GET https://dx.pagopa.it/radar.json` and verify each service's `ring`:

| Ring     | Action                                                  |
| -------- | ------------------------------------------------------- |
| `adopt`  | **Prefer** — default choice                             |
| `trial`  | OK with awareness — note in README                      |
| `assess` | Avoid unless user explicitly requests                   |
| `hold`   | **Do not use** — warn user, suggest `adopt` alternative |

If user confirms a `hold` service, add `# radar: hold — consider migrating to <alternative>` on the resource block and immediately
warn user that this may cause issues in the future. If possible, suggest an `adopt` alternative.

---

## Pre-Submission Checklist

- [ ] All resources use `pagopa-dx/*` modules where available; raw resources only for gaps
- [ ] DX provider configured; `provider::dx::resource_name()` for all names
- [ ] `dx_available_subnet_cidr` for every new subnet — no hardcoded CIDRs
- [ ] Module versions pinned with `~> major.minor`
- [ ] Target directory follows `.dx/apps/website/docs/terraform/infra-folder-structure.md`; 2+ related resources in `_modules/`
- [ ] Required tags on all resources; no hardcoded secrets
- [ ] Key Vault secrets follow `azure-keyvault-secret` skill
- [ ] Tech Radar: all services `adopt`/`trial`; `hold` items have comment + user ack
- [ ] No placeholder comments — all code complete and working
- [ ] `terraform init` + `terraform validate` pass; `terraform plan` reviewed if possible
- [ ] `pre-commit run -a` passes

---

## Resources

- [DX Documentation](https://dx.pagopa.it/docs/)
- [Terraform Best Practices](https://dx.pagopa.it/docs/terraform/)
- [Azure Naming Conventions](https://dx.pagopa.it/docs/azure/azure-naming-convention)
- [DX Terraform Modules](https://registry.terraform.io/namespaces/pagopa-dx)
