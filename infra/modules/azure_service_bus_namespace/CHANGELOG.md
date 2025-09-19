# azure_service_bus_namespace

## 0.0.6

### Patch Changes

- 2b751a4: Update references to the new DX website from pagopa.github.io/dx to dx.pagopa.it

## 0.0.5

### Patch Changes

- e9af4e5: # Patch Changes
  1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
  2. Some variables with tier dependencies have been updated with new validation rules to ensure they are only used when appropriate
     - `allowed_ips`: Now it can be defined only if use_case is default
     - `subnet_pep_id`: Now it can be defined only when private_enpoint will be created (in this case only when use_case is default)
     - `private_dns_zone_resource_group_name`: As subnet pep id now it can be defined only when private_enpoint will be created

  ## Upgrade Notes

  | Old Value | New Value | Description                                  |
  | --------- | --------- | -------------------------------------------- |
  | m         | default   | Ideal for `production` environments purposes |
  | l         | _none_    | Now don't exist                              |

  This change simplifies and clarifies the selection of Service Bus namespace.

  For Example:
  - **Before**

    ```hcl
    module "service_bus" {
      source  = "pagopa-dx/azure-service-bus-namespace/azurerm
      version = "~> 0.0"

      tier    = "m"

      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "service_bus" {
      source  = "pagopa-dx/azure-service-bus-namespace/azurerm
      version = "~> 0.0"

      use_case = "default"

      # ...other variables remain unchanged...
    }
    ```

## 0.0.4

### Patch Changes

- c54e7ce: Update contraint for pagopa-dx-azure provider by allowing minor upgrades.

## 0.0.3

### Patch Changes

- 081ce6e: Set public network access property to false to comply with Terarform provider suggestions

## 0.0.2

### Patch Changes

- 718f372: Changed module description

## 0.0.1

### Patch Changes

- ccf3e7e: Add module
