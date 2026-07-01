---
name: azure-keyvault-reference
description: "Generate Terraform that references Azure Key Vault secrets from Azure App Service, Function App, and Azure Container Apps without storing secret values in app settings, environment variables, or Terraform state. Use when adding app settings, environment variables, container app secrets, @Microsoft.KeyVault references, key_vault_secret_id, Key Vault Secrets User RBAC, managed identity secret access, or official Azure MCP RBAC checks."
---

# Azure Key Vault References for App Environment Variables

Use this skill when Terraform code configures secret-backed application settings or environment variables for Azure App Service, Function App, or Azure Container Apps.

## Core Rules

- Never place secret values in Terraform `app_settings`, container `env.value`, variables, locals, outputs, or `.tfvars` files.
- Prefer versionless Key Vault references so rotation can happen in Key Vault without a Terraform change.
- Ensure the runtime identity that resolves the secret can read Key Vault secrets.
- Check production resources and deployment slots; slots have separate managed identities.
- If Terraform creates the app and access grant together, add an explicit dependency when the provider validates the reference during creation.
- If Terraform creates the Key Vault secret resource, invoke the `azure-keyvault-secret` skill first. If the `azure-keyvault-secret` skill is not available, pause and ask the user to confirm that the Key Vault secret resource and its value are managed separately before continuing.

## Host Patterns

### App Service and Function App

Use app settings with one of these versionless values:

```hcl
"@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)"
"@Microsoft.KeyVault(SecretUri=https://<kv-name>.vault.azure.net/secrets/<secret-name>)"
```

Prefer the `VaultName` + `SecretName` form when both names are available. Use the `SecretUri` form only when an existing Terraform expression (e.g., `azurerm_key_vault_secret.example.versionless_id`) already produces a versionless secret URI that can be interpolated directly.

Use [./templates/appservice-functionapp-app-settings.tf.tpl](./templates/appservice-functionapp-app-settings.tf.tpl) when refactoring module inputs from plain settings to mixed plain/secret-backed settings.

### Azure Container Apps

Do not use `@Microsoft.KeyVault(...)` strings in container environment values. Use native Container App secrets backed by Key Vault:

- `secret.key_vault_secret_id` points to the versionless secret URI.
- `secret.identity` is `"System"` for system-assigned identity, or the user-assigned identity resource ID.
- Container env vars use `secret_name`, not `value`.

Use [./templates/container-app-key-vault-secrets.tf.tpl](./templates/container-app-key-vault-secrets.tf.tpl) for Container App code.

## RBAC Check

Before finishing, prove that the app identity can read secrets from the vault.

Complete the static check first. Only proceed to the live check if the static check finds no grant.

### Static check (Terraform)

1. Identify the principal resolving the secret:
   - App Service/Function App: system-assigned identity unless `key_vault_reference_identity_id` selects a user-assigned identity.
   - Container App: identity named by the `secret.identity` field.
   - If the principal cannot be statically determined (e.g., `key_vault_reference_identity_id` is a dynamic reference or `secret.identity` is absent), emit a Terraform comment `# TODO: verify RBAC for the runtime identity` and proceed without adding a role assignment.
2. Inspect Terraform for either:
   - DX `pagopa-dx/azure-role-assignments/azurerm` with `key_vault.roles.secrets = "reader"`.
   - Raw `azurerm_role_assignment` at Key Vault scope with `role_definition_name = "Key Vault Secrets User"`.
   - Legacy `azurerm_key_vault_access_policy` with at least `Get` and `List`.

### Live check (MCP, optional)

If official Azure MCP tooling can list role assignments or query Resource Graph, use it to verify live RBAC for existing resources. Key Vault data-plane commands alone are not proof of RBAC setup.

If no static or live grant exists and the principal is known, add it using [./templates/key-vault-secret-reader-access.tf.tpl](./templates/key-vault-secret-reader-access.tf.tpl).

For deployment slots, repeat the static check, optional live check, and missing-grant step using the slot's own system-assigned or user-assigned identity. Reference the slot resource as the principal in any `azurerm_role_assignment` rather than the production app identity. Use the same template [./templates/key-vault-secret-reader-access.tf.tpl](./templates/key-vault-secret-reader-access.tf.tpl) with `principal_id` set to the slot identity.

## Generation Workflow

1. Determine the target host from resources, module names, and variables.
2. Infer the Key Vault name, resource group, ID, and secret names from Terraform. If the Key Vault name or ID cannot be inferred from the current Terraform files (e.g., it is supplied via a variable with no default or from a remote state), emit a placeholder such as `var.key_vault_name` and add a comment `# TODO: supply the Key Vault name` rather than guessing a literal value.
3. Generate versionless secret references using the host-specific pattern.
4. Add or reuse the Key Vault secret-reader grant for the runtime principal.
5. Check for secret literals, versioned secret URIs, and missing slot identities.

## Do Not

- Do not use `azurerm_key_vault_secret.value` to move secret values through Terraform state.
- Do not pin a Key Vault secret version in app settings or Container App secrets by default. If you encounter an existing versioned secret URI, first check for an adjacent Terraform comment explaining why that specific version is required; if the comment exists, keep the versioned URI. If no comment exists, ask the user whether the pinned version is intentional or an error. If the user confirms it is intentional, keep the versioned URI and add an adjacent Terraform comment explaining why the specific version is required so future runs do not ask again. If the user says it is an error, replace it with the versionless URI.
- Do not grant broader roles such as Contributor, Key Vault Administrator, or Key Vault Secrets Officer when read-only secret resolution is sufficient.

## Reference

DX documents the App Service and Function App pattern in `apps/website/docs/azure/application-deployment/appservice-hidden-appsettings.md`.
