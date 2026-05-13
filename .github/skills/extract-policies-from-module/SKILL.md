---
name: extract-policies-from-module
description: Extract OPA/Rego policies from a DX Terraform module (and the custom dx provider) into a versioned policy bundle that downstream AI agents can use to author plain azurerm_* Terraform. Use when asked to derive, generate, refresh, or maintain OPA/conftest policies from an infra/modules/* module, when adding a new module to the DX policy bundle, or when a module's defaults change and the corresponding policies must be updated. Produces .rego policy files, a unit test file, and a regal lint config aligned with the opa-poc reference layout.
---

# Extract OPA policies from a DX Terraform module

This skill turns the implicit contract of an `infra/modules/*` module — its
hardcoded safe defaults, its `use_case`-style configuration matrices, the
naming function from `providers/azure/`, and the cross-resource invariants
it composes — into an explicit, distributable bundle of Rego policies that
downstream AI agents can validate plain `azurerm_*` Terraform against.

The reference implementation lives in [opa-poc](../../../opa-poc/) and
was hand-written for `azure_storage_account` + `azure_function_app`. This
skill encodes the workflow that produced it so the next module costs less.

## When to Use This Skill

- Adding a new `infra/modules/*` module to the DX OPA policy bundle.
- A module's defaults changed and the policies must be re-synced.
- A module gained or lost a `use_case`-style switch variable.
- The custom `dx` provider's naming function changed.
- Auditing whether a module is faithfully covered by existing policies.

## Prerequisites

- `opa` (>= 0.60), `conftest` (>= 0.50), `regal` (>= 0.20) on PATH.
- Read access to `infra/modules/<module>/`, `providers/azure/internal/provider/`.
- The reference layout in [opa-poc/policies/](../../../opa-poc/policies/)
  for the file shape and naming conventions.

## The three families of rules to extract

Every module yields rules in three distinct families. Tag each `deny` message
with the family prefix — downstream AI agents and CI dashboards group by it.

| Family   | Tag prefix  | Source in the module                                      | Example                                    |
| -------- | ----------- | --------------------------------------------------------- | ------------------------------------------ |
| Defaults | `[<res>:*]` | hardcoded values in `main.tf` / `locals.tf`               | `min_tls_version = "TLS1_2"`               |
| Matrix   | `[uc:*]`    | `local.use_cases` / `local.tiers` / similar lookup tables | `use_case = "audit"` ⇒ infra encryption on |
| Cross    | `[xref:*]`  | resources the module instantiates together                | function app ⇒ requires diagnostic setting |

A naming policy is a separate concern — it lives in `policies/lib/` because
it is shared by every resource family.

## Step-by-step workflow

### 1. Inventory the module

Read the module top-to-bottom and produce three lists:

1. **Hardcoded defaults** — every literal value in `main.tf`/`locals.tf` that
   is **not** wired to a variable. Each becomes a `[<res>:*]` rule.
2. **Switch variables** — every variable that drives a `lookup(local.X, var.Y)`
   pattern. Each becomes a Rego data table + a family of `[uc:*]` rules.
3. **Sibling resources** — every `resource ""` block the module creates
   beyond the headline one. Each becomes a `[xref:*]` rule.

For the naming policy, read `providers/azure/internal/provider/function_resource_name.go`
and the `abbreviations` map. The Rego port lives in `policies/lib/naming.rego`.

### 2. Pick the package and file layout

Mirror [opa-poc/policies/](../../../opa-poc/policies/):

```
policies/
├── lib/
│   ├── naming.rego          # package main.lib.naming — shared
│   └── naming_test.rego
├── <module>.rego            # package main, [<res>:*] rules
├── <module>_test.rego
├── <module>_use_case.rego   # package main, [uc:*] rules — only if matrix exists
├── <module>_use_case_test.rego
├── <module>_xref.rego       # package main, [xref:*] rules — only if relevant
└── <module>_xref_test.rego
```

All non-lib files share `package main`. Only **one** file per package may
carry a `# METADATA` annotation block — every other file uses plain comments.
Violating this gives `rego_type_error: package annotation redeclared` at
load time.

### 3. Write the rules

Use Rego v1 syntax everywhere:

```rego
package main

import rego.v1

deny contains msg if {
    some r in input.resource_changes
    r.type == "azurerm_storage_account"
    r.change.after.min_tls_version != "TLS1_2"
    msg := sprintf("[storage:min_tls] %s must use TLS1_2", [r.address])
}
```

For a switch-variable matrix, encode the lookup table as Rego data and a
helper that filters by tag (the AI agent surfaces the intent as a tag
because module variables are not in `terraform show -json`):

```rego
use_case_matrix := {
    "audit": {
        "replication_type": "GZRS",
        "infrastructure_encryption_enabled": true,
        # ...
    },
    # ...
}

uc_storage_accounts(plan) := [r |
    some r in plan.resource_changes
    r.type == "azurerm_storage_account"
    r.change.after.tags.DXUseCase
]
```

The tag convention is `DX<VariableName>` in PascalCase. Document it in
the module's `policies/<module>.md` next to the rules.

### 4. Write fixture-based tests

Use the `mk_*` helper pattern from
[storage_account_test.rego](../../../opa-poc/policies/storage_account_test.rego):

```rego
mk_storage(after) := {
    "resource_changes": [{
        "address": "azurerm_storage_account.test",
        "type": "azurerm_storage_account",
        "change": {"after": after},
    }],
}

test_min_tls_denied if {
    some msg in deny with input as mk_storage({"min_tls_version": "TLS1_0"})
    startswith(msg, "[storage:min_tls]")
}
```

**Critical**: when asserting "compliant fixture yields no deny", filter to
the family prefix you are testing — cross-resource rules will otherwise fire
on minimal fixtures and break unrelated tests:

```rego
test_compliant_yields_no_deny if {
    count([m | some m in deny with input as compliant; startswith(m, "[storage:")]) == 0
}
```

For "missing key" cases, use `json.remove`, **not** `object.union` — the
latter does deep merge and keeps the original key:

```rego
input_without_tag := json.remove(after, ["tags/DXUseCase"])
```

### 5. Lint with regal

Reuse the silencing list from
[opa-poc/.regal/config.yaml](../../../opa-poc/.regal/config.yaml) — the
non-obvious entries are:

| Rule                         | Category      | Why silenced                             |
| ---------------------------- | ------------- | ---------------------------------------- |
| `directory-package-mismatch` | `idiomatic`   | All files share `package main` by design |
| `defer-assignment`           | `performance` | Not under `style`, easy to miss          |
| `with-outside-test-context`  | `performance` | Tests use `with input as` helpers        |
| `rule-name-repeats-package`  | `style`       | Or rename `min_tls` to `min_tls_check`   |

Avoid the `rule-name-repeats-package` warning by **renaming pattern
constants**: `dashed_pattern` and `storage_pattern`, not `naming_pattern_*`
inside `package main.lib.naming`.

### 6. Verify

Run, in order:

```bash
opa fmt -w policies/                       # idempotent canonical formatting
opa test policies/ -v                      # all unit tests must pass
regal lint policies/                       # 0 violations
conftest test fixtures/compliant-plan.json --policy policies/ --namespace main
conftest test fixtures/non-compliant-plan.json --policy policies/ --namespace main
```

The compliant fixture must produce **0 deny**, the non-compliant must produce
**at least one deny per rule** you wrote. If a non-compliant fixture is
missing the trigger for a specific rule, the rule is untested — add the
trigger before declaring the module covered.

## Common pitfalls (each cost an iteration during opa-poc)

1. **Heredoc not `create_file` for `.rego`** — large `.rego` files written via
   the file-creation tool occasionally truncate. Use a terminal heredoc
   (`cat <<'EOF' > policies/foo.rego`) followed by `opa fmt -w`.
2. **Duplicate `# METADATA`** — only one file per package may declare it.
3. **`object.union` in tests** — does deep merge, will not remove keys.
4. **Cross-resource rules firing on single-resource fixtures** — always
   filter test assertions by the family prefix.
5. **`some _ in [1]`** — `regal` flags this as `single-item-in`; just inline
   the body.
6. **Missing tag for matrix variables** — `terraform show -json` does **not**
   include module variables. The matrix only works if the AI agent emits
   `tags.DX<VarName>`. Document this in the module's policy README.

## Output checklist

Before declaring the module covered:

- [ ] One `.rego` file per family (defaults / matrix / xref) under `policies/`.
- [ ] One `_test.rego` file per `.rego` file, same `package main`.
- [ ] Every `deny` message starts with a `[<family>:<rule_id>]` tag.
- [ ] `opa test` is green.
- [ ] `regal lint policies/` reports 0 violations.
- [ ] `conftest test` on a compliant fixture is silent.
- [ ] `conftest test` on a non-compliant fixture fires every rule at least once.
- [ ] If a `use_case`-like variable exists, the `DX<VarName>` tag convention
      is documented next to the rules.

## References

- Reference layout and worked example: [opa-poc/](../../../opa-poc/)
- Findings and rationale: [opa-poc/FINDINGS.md](../../../opa-poc/FINDINGS.md)
- Naming source of truth (Go): [providers/azure/internal/provider/function_resource_name.go](../../../providers/azure/internal/provider/function_resource_name.go)
- Companion skill (consumer side): `generate-azure-infra-with-dx-policies`
  in [plugins/terraform/skills/](../../../plugins/terraform/skills/).
