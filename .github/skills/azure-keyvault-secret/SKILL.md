---
name: azure-keyvault-secret
description: Create secure azurerm_key_vault_secret Terraform resources using the write-only value_wo pattern. Use when asked to create a key vault secret, add a secret to Azure Key Vault in Terraform, use value_wo or value_wo_version, or make secrets secure by keeping them out of Terraform state. Requires Terraform >= 1.11.0 and azurerm provider >= 4.23.
---

# Azure Key Vault Secret (Secure Write-Only Pattern)

This skill generates `azurerm_key_vault_secret` resources that use the **write-only** `value_wo` attribute, ensuring secret values are never stored in Terraform state.

## Prerequisites

Before generating any code, check the caller's Terraform files for **both** a Terraform version constraint and an `azurerm` provider version constraint.

### Terraform version

Check **both** sources for the Terraform version; if either is present it must satisfy `>= 1.11.0`.

#### 1. `.terraform-version` file

Look for a `.terraform-version` file in the project root (used by `tfenv` / `tofuenv` to pin the binary version). It contains a single plain version string, e.g.:

```
1.10.3
```

If the file exists and the version is **< 1.11.0**, stop immediately:

```
⚠️  Cannot proceed: the write-only value_wo attribute requires Terraform >= 1.11.0.

    .terraform-version pins the binary to: <version found>

    Update .terraform-version to at least 1.11.0:

        echo "1.11.0" > .terraform-version

    Then upgrade your Terraform binary (e.g. tfenv install) and re-run.
```

#### 2. `required_version` in .tf files

Look for a `required_version` constraint in any `.tf` file:

```hcl
terraform {
  required_version = ">= 1.9"   # or any other constraint
}
```

**The constraint MUST satisfy `>= 1.11.0`.**

| Scenario | Action |
|---|---|
| Constraint is `>= 1.11`, `>= 1.11.0`, `~> 1.11`, `~> 1` with no upper bound below 1.11 | ✅ Proceed to provider check |
| Constraint is `< 1.11`, `~> 1.9`, `>= 1.0, < 1.11` | ❌ Stop — inform the user |
| No `required_version` found | ❌ Stop — inform the user |

If the `required_version` requirement is **not met**, output this message and do nothing else:

```
⚠️  Cannot proceed: the write-only value_wo attribute requires Terraform >= 1.11.0.

    Your current constraint: <show the constraint found, or "not found">

    To fix this, update your versions.tf:

    terraform {
      required_version = ">= 1.11.0"
    }

    Then upgrade your Terraform binary and re-run.
```

### azurerm provider version

Look for an `azurerm` entry inside `required_providers`:

```hcl
required_providers {
  azurerm = {
    source  = "hashicorp/azurerm"
    version = "~> 4.0"   # or any other constraint
  }
}
```

**The constraint MUST satisfy `>= 4.23`.**

| Scenario | Action |
|---|---|
| Constraint is `~> 4.23`, `>= 4.23`, `~> 4.0` with no upper bound below 4.23, `~> 4` | ✅ Proceed |
| Constraint is `~> 3.x`, `< 4.23`, `>= 3.116, < 5.0` with no guaranteed 4.23 overlap | ❌ Stop — inform the user |
| No azurerm provider block found | ❌ Stop — inform the user |

If the azurerm requirement is **not met**, output this message and do nothing else:

```
⚠️  Cannot proceed: the write-only value_wo attribute for azurerm_key_vault_secret
    requires the azurerm provider >= 4.23.

    Your current constraint: <show the constraint found, or "not found">

    To fix this, update your versions.tf:

    required_providers {
      azurerm = {
        source  = "hashicorp/azurerm"
        version = "~> 4.23"
      }
    }

    Then run `terraform init -upgrade` to apply the change.
```

## Workflow

### Step 1 — Gather inputs

Ask the user (or infer from context) for:

| Input | Required | Example |
|---|---|---|
| Resource label (Terraform identifier) | Yes | `db_password` |
| Secret name (Azure resource name) | Yes | `"db-password"` |
| `key_vault_id` reference | Yes | `azurerm_key_vault.main.id` |
| `content_type` | No | `"text/plain"` |
| `tags` | No | `var.tags` |

### Step 2 — Generate the resource

Use the template at [./templates/key_vault_secret.tf.tpl](./templates/key_vault_secret.tf.tpl) and fill in the gathered values.

**Rules that must never be broken:**
- `value_wo` must always be `""`
- `value_wo_version` must always be `1`
- Never use the `value` attribute — it stores the secret in state

### Step 3 — Explain the pattern

After generating the code, include a short explanation:

```
ℹ️  The secret is created with value_wo = "" so Terraform never stores the actual
    secret value in state. Set the real value through a secure channel (CI/CD pipeline,
    Azure CLI, or the portal) after the first apply. Increment value_wo_version
    whenever you need Terraform to trigger an update cycle.
```

See [./references/write-only-secrets.md](./references/write-only-secrets.md) for full background.
