# DX - Azure Event HUB

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.7.5 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_event_hub"></a> [event\_hub](#module\_event\_hub) | github.com/pagopa/terraform-azurerm-v3//eventhub | v8.44.0 |
| <a name="module_event_hub_configuration"></a> [event\_hub\_configuration](#module\_event\_hub\_configuration) | github.com/pagopa/terraform-azurerm-v3//eventhub_configuration | v8.44.0 |
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_private_endpoint.event_hub_pe](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_eventhubs"></a> [eventhubs](#input\_eventhubs) | A list of event hubs to add to namespace. | <pre>list(object({<br>    name              = string       # (Required) Specifies the name of the EventHub resource. Changing this forces a new resource to be created.<br>    partitions        = number       # (Required) Specifies the current number of shards on the Event Hub.<br>    message_retention = number       # (Required) Specifies the number of days to retain the events for this Event Hub.<br>    consumers         = list(string) # Manages a Event Hubs Consumer Group as a nested resource within an Event Hub.<br>    keys = list(object({<br>      name   = string # (Required) Specifies the name of the EventHub Authorization Rule resource. Changing this forces a new resource to be created.<br>      listen = bool   # (Optional) Does this Authorization Rule have permissions to Listen to the Event Hub? Defaults to false.<br>      send   = bool   # (Optional) Does this Authorization Rule have permissions to Send to the Event Hub? Defaults to false.<br>      manage = bool   # (Optional) Does this Authorization Rule have permissions to Manage to the Event Hub? When this property is true - both listen and send must be too. Defaults to false.<br>    }))               # Manages a Event Hubs authorization Rule within an Event Hub.<br>  }))</pre> | `[]` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group of the private DNS zone | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 'test', 'standard', 'premium'. | `string` | `"test"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_config_hub_ids"></a> [config\_hub\_ids](#output\_config\_hub\_ids) | Map of hubs and their ids. |
| <a name="output_config_key_ids"></a> [config\_key\_ids](#output\_config\_key\_ids) | List of key ids. |
| <a name="output_config_keys"></a> [config\_keys](#output\_config\_keys) | Map of hubs with keys => primary\_key / secondary\_key mapping. |
| <a name="output_hub_ids"></a> [hub\_ids](#output\_hub\_ids) | Map of hubs and their ids. |
| <a name="output_key_ids"></a> [key\_ids](#output\_key\_ids) | List of key ids. |
| <a name="output_keys"></a> [keys](#output\_keys) | Map of hubs with keys => primary\_key / secondary\_key mapping. |
| <a name="output_name"></a> [name](#output\_name) | The name of this Event Hub |
| <a name="output_namespace_id"></a> [namespace\_id](#output\_namespace\_id) | Id of Event Hub Namespace. |
| <a name="output_private_dns_zone"></a> [private\_dns\_zone](#output\_private\_dns\_zone) | ID of the private DNS zone which resolves the name of the Private Endpoint used to connect to EventHub |
<!-- END_TF_DOCS -->
