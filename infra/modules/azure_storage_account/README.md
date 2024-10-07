# azure_storage_account

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 3.30 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.storage_account_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_security_center_storage_defender.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_storage_defender) | resource |
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_network_rules.network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
| [azurerm_private_dns_zone.storage_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_access_tier"></a> [access\_tier](#input\_access\_tier) | (Optional) Access tier of the Storage Account. Defaults to Hot. | `string` | `"Hot"` | no |
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | (Optional) Set the Action Group Id to invoke when the Storage Account alert triggers. Required when tier is l. | `string` | `null` | no |
| <a name="input_blob_features"></a> [blob\_features](#input\_blob\_features) | (Optional) Blob features configuration | <pre>object({<br>    restore_policy_days   = optional(number, 0)<br>    delete_retention_days = optional(number, 0)<br>    last_access_time      = optional(bool, false)<br>    versioning            = optional(bool, false)<br>    change_feed = object({<br>      enabled           = optional(bool, false)<br>      retention_in_days = optional(number, 0)<br>    })<br>    immutability_policy = object({<br>      enabled                       = optional(bool, false)<br>      allow_protected_append_writes = optional(bool, false)<br>      period_since_creation_in_days = optional(number, 730)<br>    })<br>  })</pre> | <pre>{<br>  "change_feed": {<br>    "enabled": false,<br>    "retention_in_days": 0<br>  },<br>  "delete_retention_days": 0,<br>  "immutability_policy": {<br>    "enabled": false<br>  },<br>  "last_access_time": false,<br>  "restore_policy_days": 0,<br>  "versioning": false<br>}</pre> | no |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | (Optional) Custom domain configuration | <pre>object({<br>    name          = optional(string, null)<br>    use_subdomain = optional(bool, false)<br>  })</pre> | <pre>{<br>  "name": null,<br>  "use_subdomain": false<br>}</pre> | no |
| <a name="input_customer_managed_key"></a> [customer\_managed\_key](#input\_customer\_managed\_key) | (Optional) Customer managed key to use for encryption | <pre>object({<br>    enabled                   = optional(bool, false)<br>    type                      = optional(string, null)<br>    user_assigned_identity_id = optional(string, null)<br>    key_vault_key_id          = optional(string, null)<br>    managed_hsm_key_id        = optional(string, null)<br>  })</pre> | <pre>{<br>  "enabled": false<br>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_force_public_network_access_enabled"></a> [force\_public\_network\_access\_enabled](#input\_force\_public\_network\_access\_enabled) | (Optional) Whether the Storage Account permits public network access or not. Defaults to false. | `bool` | `false` | no |
| <a name="input_network_rules"></a> [network\_rules](#input\_network\_rules) | (Optional) Network rules for the Storage Account. If not provided, defaults will be used. | <pre>object({<br>    default_action             = string       # Specifies the default action of allow or deny when no other rules match. Valid options are Deny or Allow<br>    bypass                     = list(string) # Specifies whether traffic is bypassed for Logging/Metrics/AzureServices. Valid options are any combination of Logging, Metrics, AzureServices, or None<br>    ip_rules                   = list(string) # List of public IP or IP ranges in CIDR Format. Only IPV4 addresses are allowed<br>    virtual_network_subnet_ids = list(string) # A list of resource ids for subnets.<br>  })</pre> | <pre>{<br>  "bypass": [],<br>  "default_action": "Deny",<br>  "ip_rules": [],<br>  "virtual_network_subnet_ids": []<br>}</pre> | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | (Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_static_website"></a> [static\_website](#input\_static\_website) | (Optional) Static website configuration | <pre>object({<br>    enabled            = optional(bool, false)<br>    index_document     = optional(string, null)<br>    error_404_document = optional(string, null)<br>  })</pre> | <pre>{<br>  "error_404_document": null,<br>  "index_document": null<br>}</pre> | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_subservices_enabled"></a> [subservices\_enabled](#input\_subservices\_enabled) | (Optional) Subservices enabled for the Storage Account. Creates peps for enabled services. By default, only blob is enabled. | <pre>object({<br>    blob  = optional(bool, true)<br>    file  = optional(bool, false)<br>    queue = optional(bool, false)<br>    table = optional(bool, false)<br>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 's', 'l'. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
