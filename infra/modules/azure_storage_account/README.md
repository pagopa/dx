# DX - Azure Storage Account

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-storage-account/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-storage-account%2Fazurerm%2Flatest)

This Terraform module provisions an Azure Storage Account with optional configurations for advanced features, networking, and monitoring.

## Features

- **Tiered Configurations**: Supports multiple tiers (`s`, `l`) for different workload demands.
- **Advanced Threat Protection**: Enables advanced threat protection for enhanced security.
- **Private Networking**: Configures private endpoints and DNS zones for secure access.
- **Blob Features**: Supports versioning, change feed, immutability policies, and more.
- **Static Website Hosting**: Configures static website hosting with custom domains.
- **Monitoring and Alerts**: Includes metric alerts and diagnostic settings for operational visibility.
- **Customer-Managed Keys (CMK)**: Supports encryption with customer-managed keys.

## Tier Comparison

| Tier | Description                                                      | Alerts | Advanced Threat Protection | Replication Type | Account Tier |
|------|------------------------------------------------------------------|--------|----------------------------|------------------|--------------|
| `s`  | Ideal for lightweight workloads, testing, and development.       | No     | No                         | LRS              | Standard     |
| `l`  | Suitable for production with moderate to high performance needs. | Yes    | Yes (except in italynorth) | ZRS              | Standard     |

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
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_customer_managed_key.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key) | resource |
| [azurerm_storage_account_network_rules.network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
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
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where the storage account and related resources will be deployed. | `string` | n/a | yes |
| <a name="input_static_website"></a> [static\_website](#input\_static\_website) | Configures static website hosting with index and error documents. | <pre>object({<br/>    enabled            = optional(bool, false)<br/>    index_document     = optional(string, null)<br/>    error_404_document = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false,<br/>  "error_404_document": null,<br/>  "index_document": null<br/>}</pre> | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet used for private endpoints. Required only if `force_public_network_access_enabled` is set to false. | `string` | `null` | no |
| <a name="input_subservices_enabled"></a> [subservices\_enabled](#input\_subservices\_enabled) | Enables subservices (blob, file, queue, table). Creates Private Endpoints for enabled services. Defaults to 'blob' only. Used only if force\_public\_network\_access\_enabled is false. | <pre>object({<br/>    blob  = optional(bool, true)<br/>    file  = optional(bool, false)<br/>    queue = optional(bool, false)<br/>    table = optional(bool, false)<br/>  })</pre> | `{}` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to all resources created by this module. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Storage account tier depending on demanding workload. Allowed values: 's', 'l'. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | The ID of the Azure Storage Account. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Azure Storage Account. |
| <a name="output_primary_connection_string"></a> [primary\_connection\_string](#output\_primary\_connection\_string) | The primary connection string for the Azure Storage Account. |
| <a name="output_primary_web_host"></a> [primary\_web\_host](#output\_primary\_web\_host) | The primary web host URL for the Azure Storage Account. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the managed identity associated with the Azure Storage Account. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group containing the Azure Storage Account. |
<!-- END_TF_DOCS -->
