<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apim"></a> [apim](#module\_apim) | ./modules/apim | n/a |
| <a name="module_cosmos"></a> [cosmos](#module\_cosmos) | ./modules/cosmos | n/a |
| <a name="module_event_hub"></a> [event\_hub](#module\_event\_hub) | ./modules/event_hub | n/a |
| <a name="module_key_vault"></a> [key\_vault](#module\_key\_vault) | ./modules/key_vault | n/a |
| <a name="module_redis"></a> [redis](#module\_redis) | ./modules/redis | n/a |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | ./modules/storage_account | n/a |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | A list of APIM role assignments | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    role                = string<br/>  }))</pre> | `[]` | no |
| <a name="input_cosmos"></a> [cosmos](#input\_cosmos) | A list of CosmosDB role assignments | <pre>list(object({<br/>    account_name        = string<br/>    resource_group_name = string<br/>    role                = string<br/>    database            = optional(string, "*")<br/>    collections         = optional(list(string), ["*"])<br/>  }))</pre> | `[]` | no |
| <a name="input_event_hub"></a> [event\_hub](#input\_event\_hub) | A list of event hub role assignments | <pre>list(object({<br/>    namespace_name      = string<br/>    resource_group_name = string<br/>    event_hub_names     = optional(list(string), ["*"])<br/>    role                = string<br/>  }))</pre> | `[]` | no |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | A list of key vault role assignments | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    roles = object({<br/>      secrets      = optional(string, "")<br/>      certificates = optional(string, "")<br/>      keys         = optional(string, "")<br/>    })<br/><br/>    override_roles = optional(object({<br/>      secrets      = optional(list(string), [])<br/>      certificates = optional(list(string), [])<br/>      keys         = optional(list(string), [])<br/>      }), {<br/>      secrets      = []<br/>      certificates = []<br/>      keys         = []<br/>    })<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_redis"></a> [redis](#input\_redis) | A list of Redis role assignments | <pre>list(object({<br/>    cache_name          = string<br/>    resource_group_name = string<br/>    role                = string<br/>    username            = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_blob"></a> [storage\_blob](#input\_storage\_blob) | A list of storage blob role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    container_name       = optional(string, "*")<br/>    role                 = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_queue"></a> [storage\_queue](#input\_storage\_queue) | A list of storage queue role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    queue_name           = optional(string, "*")<br/>    role                 = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_table"></a> [storage\_table](#input\_storage\_table) | A list of storage table role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    table_name           = optional(string, "*")<br/>    role                 = string<br/>  }))</pre> | `[]` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->