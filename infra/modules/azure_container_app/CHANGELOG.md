## 6.0.1 (2026-07-07)

### 🩹 Fixes

- Fix naming in integration tests ([#1941](https://github.com/pagopa/dx/pull/1941))

### ❤️ Thank You

- Andrea Grillo

# 6.0.0 (2026-07-06)

### ⚠️  Breaking Changes

- Set Terraform minimum version to 1.14.0 ([#1940](https://github.com/pagopa/dx/pull/1940))

### ❤️ Thank You

- Andrea Grillo

# 5.0.0 (2026-06-04)

### ⚠️  Breaking Changes

- Refactor the Azure Container App module contract and align deployment, access, and monitoring behavior. ([#1744](https://github.com/pagopa/dx/pull/1744))

  ## Major version upgrade

  - Migrate renamed inputs:
    - `container_app_templates` -> `containers`
    - `target_port` -> `container_port`
    - `revision_mode` -> `deployment_strategy` (`Multiple` -> `Incremental`, `Single` -> `Latest`)
    - `public_access_enabled` -> `allow_access_from_environment_only` with inverted flag semantics
    - `diagnostic_settings` -> `log_analytics_workspace_id`
  - Update secrets usage:
    - remove `scheduled_for_deletion` from `secrets`
    - map secrets for each container explicitly through `containers[*].secret_names`
  - Review defaults and outputs:
    - `user_assigned_identity_id` is now optional
    - `use_case = "development"` is now supported with smaller defaults and without mandatory Log Analytics
    - `url` now exposes the ingress FQDN and `url_latest_revision` is available as a new output

  ## Included changes

  - Pin provider constraints:
    - `terraform >= 1.14.0`
    - `azurerm ~> 4.70`
    - `azapi ~> 2.9`
    - `dx ~> 0.10`
    - `time ~> 0.14`
  - Add the module architecture diagram to the README and align examples to `~> 5.0`
  - Enhanced the test suite

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 4.2.2 (2026-05-20)

### 🩹 Fixes

- Add `scheduled_for_deletion` to keep secrets in the Container App without exposing them as container environment variables. This is useful when a secret is not needed by the next application version. In these cases, first execute the deployment of the new container version, which removes the dependency on that secret. Then, set this property to `true` to not expose the secret to the container, but keeping it available at the Container App level. Then, remove the secret from the IaC configuration to remove it completely. ([#1760](https://github.com/pagopa/dx/pull/1760))

### ❤️ Thank You

- Andrea Grillo

## 4.2.1 (2026-05-08)

### 🩹 Fixes

- Replace `metric` with `enabled_metric` as per deprecation notice in `azurerm_monitor_diagnostic_setting` resource ([#1715](https://github.com/pagopa/dx/pull/1715))

### ❤️ Thank You

- Andrea Grillo

## 4.2.0

### Minor Changes

- 3e23166: Add support for external ingress, custom domains, and managed authentication.
  - Add `public_access_enabled` variable (default: `true`, preserving backward compatibility) to toggle public FQDN exposure.
  - Add `custom_domain` variable to bind a custom hostname. Supports auto-provisioned Azure-managed TLS certificates (via `dns` block with automatic CNAME and TXT records) or pre-uploaded certificates (via `certificate_id`).
  - Add `authentication` variable to enable Azure Managed Authentication (EasyAuth) via Microsoft Entra ID. Unauthenticated browser requests are redirected to the Entra ID login page. The module automatically injects the client secret from Key Vault into the Container App secrets.
  - Add input validations on `target_port`, `custom_domain`, and `authentication` to catch misconfiguration early.

  Requires `hashicorp/time >= 0.9` and `azure/azapi >= 2.0` providers.

## 4.1.0

### Minor Changes

- 37f5ab3: Allow setting of diagnostic settings

### Patch Changes

- 8f7ca94: Align examples

## 4.0.0

### Major Changes

- a0eb678: # Major Changes
  1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
  2. Add new variables `size` for cpu/memory override.
  3. Update README documentation.
  4. Update `autoscaler` variable to include minimum and maximum replica limits. If these are not defined, they default to `null` and the values from the `use_case` will be applied.

  ## Upgrade Notes

  | Old Value | New Value | Description                         |
  | --------- | --------- | ----------------------------------- |
  | xs        | _none_    | Does not exist anymore              |
  | s         | _none_    | Does not exist anymore              |
  | m         | default   | Ideal for `production` environments |
  | l         | _none_    | Does not exist anymore              |

  This change simplifies and clarifies the selection of Container App.

  To migrate to this new major version:
  1. Update the module version to `~> 4.0` in your Terraform configuration.
  2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
  3. Optionally, configure the new `size` variable to use the desired CPU/Memory configuration within the Container App.

  For Example:
  - **Before**

    ```hcl
    module "container_app" {
      source  = "pagopa-dx/azure-container-app/azurerm"
      version = "~> 3.0"
      tier    = "m"
      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "container_app" {
      source  = "pagopa-dx/azure-container-app/azurerm"
      version = "~> 4.0"
      use_case = "default"
      # ...other variables remain unchanged...
    }
    ```

### Patch Changes

- 329fd82: Added support to aws provider version 6

## 3.0.1

### Patch Changes

- 724717e: Fix azurerm minimum version definition

## 3.0.0

### Major Changes

- f2f4f1a: Set the azurerm provider at least to version `4.16.0` to ensure compatibility with new scaling features.

  New features:
  - Add support to scaling rules (both built-in and custom)
  - Add support to override default number of replicas
  - Set the termination grace period to 30 seconds

  Documentation:
  - Add documentation for scaling rules

  ### Upgrade Notes
  - Set the azurerm provider at least to version `4.16.0` as follows:

  ```hcl
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.16.0"
    }
  }
  ```

## 2.0.0

### Major Changes

- 5731c31: Container image name is no longer stored in Terraform state file, to allow CD pipelines to update the tag without requiring an update to the Terraform code.

## 1.0.2

### Patch Changes

- e73a238: Add module version tag

## 1.0.1

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.0

### Major Changes

- b398ae3: The user-assigned managed identity is now used to authenticate the Container App with other Azure services.

  New features:
  - Add support to private Azure Container Registry
  - Add support to user-assigned managed identity

  Bug fixes:
  - The variable `readiness_probe.initial_delay` was unintentionally unused

  Documentation:
  - Add description for outputs

## 0.1.4

### Patch Changes

- b911497: Add principal_id property to outputs

## 0.1.3

### Patch Changes

- b013061: Replace naming convention module with DX provider functions
- a6eeb06: Auto generate the container name if not provided. Previous version used the image name as container name, but it contains invalid characters.

## 0.1.2

### Patch Changes

- 0fd9f3a: Replace some unsupported characters from secret names

## 0.1.1

### Patch Changes

- 8df9bae: Fix an issue which prevented to disable startup and and readiness probes.

## 0.1.0

### Minor Changes

- 9b7429b: Add support to secrets with KeyVault reference

## 0.0.3

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module
- 9d18d7c: Update README following new guide lines

## 0.0.2

### Patch Changes

- d29a1f4: Added new module for Azure Container App
