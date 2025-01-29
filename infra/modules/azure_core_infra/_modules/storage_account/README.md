# storage_account

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_security_center_storage_defender.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_storage_defender) | resource |
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_network_rules.network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
| [azurerm_private_dns_zone.storage_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_blob_features"></a> [blob\_features](#input\_blob\_features) | (Optional) Blob features configuration | <pre>object({<br/>    restore_policy_days   = optional(number, 0)<br/>    delete_retention_days = optional(number, 0)<br/>    last_access_time      = optional(bool, false)<br/>    versioning            = optional(bool, false)<br/>    change_feed = object({<br/>      enabled           = optional(bool, false)<br/>      retention_in_days = optional(number, 0)<br/>    })<br/>    immutability_policy = object({<br/>      enabled                       = optional(bool, false)<br/>      allow_protected_append_writes = optional(bool, false)<br/>      period_since_creation_in_days = optional(number, 730)<br/>    })<br/>  })</pre> | <pre>{<br/>  "change_feed": {<br/>    "enabled": false,<br/>    "retention_in_days": 0<br/>  },<br/>  "delete_retention_days": 0,<br/>  "immutability_policy": {<br/>    "enabled": false<br/>  },<br/>  "last_access_time": false,<br/>  "restore_policy_days": 0,<br/>  "versioning": false<br/>}</pre> | no |
| <a name="input_force_public_network_access_enabled"></a> [force\_public\_network\_access\_enabled](#input\_force\_public\_network\_access\_enabled) | (Optional) Whether the Storage Account permits public network access or not. Defaults to false. | `bool` | `false` | no |
| <a name="input_location"></a> [location](#input\_location) | Location | `string` | n/a | yes |
| <a name="input_network_rules"></a> [network\_rules](#input\_network\_rules) | (Optional) Network rules for the Storage Account. If not provided, defaults will be used. | <pre>object({<br/>    default_action             = string       # Specifies the default action of allow or deny when no other rules match. Valid options are Deny or Allow<br/>    bypass                     = list(string) # Specifies whether traffic is bypassed for Logging/Metrics/AzureServices. Valid options are any combination of Logging, Metrics, AzureServices, or None<br/>    ip_rules                   = list(string) # List of public IP or IP ranges in CIDR Format. Only IPV4 addresses are allowed<br/>    virtual_network_subnet_ids = list(string) # A list of resource ids for subnets.<br/>  })</pre> | <pre>{<br/>  "bypass": [],<br/>  "default_action": "Deny",<br/>  "ip_rules": [],<br/>  "virtual_network_subnet_ids": []<br/>}</pre> | no |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | env prefix, short environment and short location amd domain | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_subservices_enabled"></a> [subservices\_enabled](#input\_subservices\_enabled) | (Optional) Subservices enabled for the Storage Account. Creates peps for enabled services. By default, only blob is enabled. Possible values are blob, file, queue, table. | `list(string)` | <pre>[<br/>  "blob"<br/>]</pre> | no |
| <a name="input_suffix"></a> [suffix](#input\_suffix) | the instance number | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 's', 'l'. | `string` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network in which to create the subnet | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_primary_connection_string"></a> [primary\_connection\_string](#output\_primary\_connection\_string) | n/a |
| <a name="output_primary_web_host"></a> [primary\_web\_host](#output\_primary\_web\_host) | n/a |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | n/a |
<!-- END_TF_DOCS -->
