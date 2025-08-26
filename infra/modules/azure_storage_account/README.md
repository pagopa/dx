# DX - Azure Storage Account

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-storage-account/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-storage-account%2Fazurerm%2Flatest)

This Terraform module provisions an Azure Storage Account with optional configurations for advanced features, networking, and monitoring.

## Features

- **Use Case Profiles**: Simplifies deployment by providing pre-configured profiles (`default`, `audit`, `delegated_access`, `development`, `archive`) tailored for specific needs.
- **Advanced Threat Protection**: Enables advanced threat protection for enhanced security only for public configurations.
- **Advanced Security**: Enforces the use of User Delegation SAS for secure shared access if `delegated_access`.
- **Data Lifecycle Management**: Includes automated policies for tiering data from Hot to Cool/Archive and setting retention periods to optimize costs.
- **Private Networking**: Configures private endpoints and DNS zones for secure access.
- **Blob Features**: Supports versioning, change feed, immutability policies, and more.
- **Static Website Hosting**: Configures static website hosting with custom domains.
- **Monitoring and Alerts**: Includes metric alerts and diagnostic settings for operational visibility.
- **Customer-Managed Keys (CMK)**: Supports encryption with customer-managed keys, mandatory only for `audit` for enhanced encryption control (BYOK).

## Use cases Comparison

| Use case           | Description                                                        | Alerts | Advanced Threat Protection | Replication Type        | Account Tier |
|--------------------|--------------------------------------------------------------------|--------|----------------------------|-------------------------|--------------|
| `development`      | Ideal for lightweight workloads, testing, and development.         | No     | No                         | LRS                     | Standard     |
| `default`          | Suitable for production with moderate to high performance needs.   | Yes    | No                         | ZRS                     | Standard     |
| `audit`            | For storing audit logs with high security and long-term retention. | Yes    | No                         | ZRS + secondary replica | Standard     |
| `delegated_access` | For sharing files externally, forcing secure access patterns.      | Yes    | Yes                        | ZRS                     | Standard     |
| `archive`          | For long-term, low-cost backup and data archiving.                 | No     | No                         | LRS + secondary replica | Standard     |

## Important Considerations for CDN Origin

This storage account module should **not** be used as an origin for an Azure CDN if the variable `force_public_network_access_enabled` is set to `false` (as default). Azure CDN requires the origin to be publicly accessible. For CDN setups, please refer to the dedicated [Azure CDN module](https://registry.terraform.io/modules/pagopa-dx/azure-cdn/azurerm/latest).

## Note about Replication

### How to configure

For use cases with `secondary replica`, the module creates a secondary storage account in the specified `secondary_location` to enable geo-redundant storage. This setup ensures data durability and availability across different geographic regions.

When using the `replication_container_names` variable, ensure that the specified container names exist in both the primary and secondary storage accounts. The module will configure object replication policies for these containers to keep them synchronized.

### Archive policy

The archive lifecycle management policy use the value `tier_to_archive_after_days_since_creation_greater_than` to move blobs to the Archive tier, but this feature is available only in some regions and only when Replication Type is `LRS` and account kind is `BlobStorage`.
Refer to the [Azure tabele](https://azure.microsoft.com/it-it/explore/global-infrastructure/products-by-region/table) for more details, check `Archive Storage`.

## Security Considerations

### Customer-Managed Key (BYOK) Encryption

For enhanced control over data encryption, this module supports **Bring Your Own Key (BYOK)**. Instead of using Microsoft-managed keys, you can provide a key from your own Azure Key Vault.

- The `audit` use case requires BYOK to be enabled for maximum security.
- For all other use cases, this feature is optional.
- To enable it, simply provide the necessary details in the `customer_managed_key` variable. The module will handle the rest, including the creation of access policies or role assignments on the Key Vault.

### User Delegation SAS for Secure Access

For the `delegated_access` use case, this module enhances security by disabling the main storage account access keys. This action has a critical consequence:

- It becomes impossible to create a standard Service SAS token.
- The only way to generate a **Shared Access Signature (SAS)** is by using User Delegation SAS.

This model forces applications to first authenticate with Azure Active Directory (Azure AD) to obtain a temporary key. This is a significant security improvement because access is tied to an identity and can be centrally managed and revoked via Azure RBAC. To implement this, you must grant the Storage Blob Delegator role to the identities that need to create SAS tokens.

  **NOTE**:
  Terraform uses Shared Key Authorisation to provision Storage Containers, Blobs and other items - when Shared Key Access is disabled, you will need to enable the `storage_use_azuread` flag in the Provider block to use Azure AD for authentication, however not all Azure Storage services support Active Directory authentication.

## Usage Example

A complete example of how to use this module can be found in the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-storage-account/tree/main/examples/complete) directory.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_access_policy.keys](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_key_vault_key.key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key) | resource |
| [azurerm_monitor_metric_alert.storage_account_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_role_assignment.keys](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_security_center_storage_defender.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_storage_defender) | resource |
| [azurerm_storage_account.secondary_replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_customer_managed_key.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key) | resource |
| [azurerm_storage_account_network_rules.network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
| [azurerm_storage_management_policy.lifecycle_archive](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy) | resource |
| [azurerm_storage_management_policy.lifecycle_audit](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy) | resource |
| [azurerm_storage_management_policy.secondary_lifecycle_archive](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy) | resource |
| [azurerm_storage_management_policy.secondary_lifecycle_audit](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy) | resource |
| [azurerm_storage_object_replication.geo_replication_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_object_replication) | resource |
| [azurerm_key_vault.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_private_dns_zone.storage_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_access_tier"></a> [access\_tier](#input\_access\_tier) | Access tier for the storage account. Options: 'Hot', 'Cool', 'Cold', 'Premium'. Defaults to 'Hot'. | `string` | `"Hot"` | no |
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | ID of the Action Group for alerts. Required for tier 'l'. | `string` | `null` | no |
| <a name="input_blob_features"></a> [blob\_features](#input\_blob\_features) | Advanced blob features like versioning, change feed, immutability, and retention policies. | <pre>object({<br/>    restore_policy_days   = optional(number, 0)<br/>    delete_retention_days = optional(number, 0)<br/>    last_access_time      = optional(bool, false)<br/>    versioning            = optional(bool, false)<br/>    change_feed = optional(object({<br/>      enabled           = optional(bool, false)<br/>      retention_in_days = optional(number, 0)<br/>    }), { enabled = false })<br/>    immutability_policy = optional(object({<br/>      enabled                       = optional(bool, false)<br/>      allow_protected_append_writes = optional(bool, false)<br/>      period_since_creation_in_days = optional(number, 730)<br/>    }), { enabled = false })<br/>  })</pre> | <pre>{<br/>  "change_feed": {<br/>    "enabled": false,<br/>    "retention_in_days": 0<br/>  },<br/>  "delete_retention_days": 0,<br/>  "immutability_policy": {<br/>    "enabled": false<br/>  },<br/>  "last_access_time": false,<br/>  "restore_policy_days": 0,<br/>  "versioning": false<br/>}</pre> | no |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration for the storage account. | <pre>object({<br/>    name          = optional(string, null)<br/>    use_subdomain = optional(bool, false)<br/>  })</pre> | <pre>{<br/>  "name": null,<br/>  "use_subdomain": false<br/>}</pre> | no |
| <a name="input_customer_managed_key"></a> [customer\_managed\_key](#input\_customer\_managed\_key) | Configures customer-managed keys (CMK) for encryption. Supports only 'kv' (Key Vault). | <pre>object({<br/>    enabled                   = optional(bool, false)<br/>    type                      = optional(string, null)<br/>    key_name                  = optional(string, null)<br/>    user_assigned_identity_id = optional(string, null)<br/>    key_vault_id              = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_force_public_network_access_enabled"></a> [force\_public\_network\_access\_enabled](#input\_force\_public\_network\_access\_enabled) | Allows public network access. Defaults to 'false'. | `bool` | `false` | no |
| <a name="input_network_rules"></a> [network\_rules](#input\_network\_rules) | Defines network rules for the storage account:<br/>- `default_action`: Default action when no rules match ('Deny' or 'Allow').<br/>- `bypass`: Services bypassing restrictions (valid values: 'Logging', 'Metrics', 'AzureServices').<br/>- `ip_rules`: List of IPv4 addresses or CIDR ranges.<br/>- `virtual_network_subnet_ids`: List of subnet resource IDs.<br/>Defaults to denying all traffic unless explicitly allowed. | <pre>object({<br/>    default_action             = string<br/>    bypass                     = list(string)<br/>    ip_rules                   = list(string)<br/>    virtual_network_subnet_ids = list(string)<br/>  })</pre> | <pre>{<br/>  "bypass": [],<br/>  "default_action": "Deny",<br/>  "ip_rules": [],<br/>  "virtual_network_subnet_ids": []<br/>}</pre> | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group for the private DNS zone. Defaults to the virtual network's resource group. | `string` | `null` | no |
| <a name="input_replication_container_names"></a> [replication\_container\_names](#input\_replication\_container\_names) | A list of container names to be replicated. | `list(string)` | `[]` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where the storage account and related resources will be deployed. | `string` | n/a | yes |
| <a name="input_secondary_location"></a> [secondary\_location](#input\_secondary\_location) | Secondary location for geo-redundant storage accounts. Used if `use_case` need a replication\_type like GRS or GZRS. | `string` | `"westeurope"` | no |
| <a name="input_static_website"></a> [static\_website](#input\_static\_website) | Configures static website hosting with index and error documents. | <pre>object({<br/>    enabled            = optional(bool, false)<br/>    index_document     = optional(string, null)<br/>    error_404_document = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false,<br/>  "error_404_document": null,<br/>  "index_document": null<br/>}</pre> | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet used for private endpoints. Required only if `force_public_network_access_enabled` is set to false. | `string` | `null` | no |
| <a name="input_subservices_enabled"></a> [subservices\_enabled](#input\_subservices\_enabled) | Enables subservices (blob, file, queue, table). Creates Private Endpoints for enabled services. Defaults to 'blob' only. Used only if force\_public\_network\_access\_enabled is false. | <pre>object({<br/>    blob  = optional(bool, true)<br/>    file  = optional(bool, false)<br/>    queue = optional(bool, false)<br/>    table = optional(bool, false)<br/>  })</pre> | `{}` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to all resources created by this module. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Storage account use case. Allowed values: 'default', 'audit', 'delegated\_access', 'development', 'archive'. | `string` | `"default"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | The ID of the Azure Storage Account. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Azure Storage Account. |
| <a name="output_primary_connection_string"></a> [primary\_connection\_string](#output\_primary\_connection\_string) | The primary connection string for the Azure Storage Account. |
| <a name="output_primary_web_host"></a> [primary\_web\_host](#output\_primary\_web\_host) | The primary web host URL for the Azure Storage Account. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the managed identity associated with the Azure Storage Account. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group containing the Azure Storage Account. |
| <a name="output_secondary_replica"></a> [secondary\_replica](#output\_secondary\_replica) | n/a |
<!-- END_TF_DOCS -->
