# DX - Azure App Service Plan Autoscaler Module

<!-- markdownlint-disable -->
<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.100.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.106.1 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |
| [azurerm_linux_function_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/linux_function_app) | data source |
| [azurerm_linux_web_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/linux_web_app) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_name"></a> [app\_service\_name](#input\_app\_service\_name) | Set name of the App Service to monitor | `string` | `null` | no |
| <a name="input_function_app_name"></a> [function\_app\_name](#input\_function\_app\_name) | Set the name of the Function App to monitor | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_scale_metrics"></a> [scale\_metrics](#input\_scale\_metrics) | (Optional) Set the metrics to monitor. CPU and Memory are mandatory, Requests is not. Each attribute has a default value that can be overridden | <pre>object({<br>    requests = optional(object({<br>      upper_threshold = number<br>      lower_threshold = number<br>      increase_by     = number<br>      decrease_by     = number<br>    }), null)<br>    cpu = optional(object({<br>      upper_threshold = optional(number, 80)<br>      lower_threshold = optional(number, 20)<br>      increase_by     = optional(number, 1)<br>      decrease_by     = optional(number, 1)<br>      }), {<br>      upper_threshold = 80<br>      lower_threshold = 20<br>      increase_by     = 1<br>      decrease_by     = 1<br>    })<br>    memory = optional(object({<br>      upper_threshold = optional(number, 70)<br>      lower_threshold = optional(number, 20)<br>      increase_by     = optional(number, 1)<br>      decrease_by     = optional(number, 1)<br>      }), {<br>      upper_threshold = 70<br>      lower_threshold = 20<br>      increase_by     = 1<br>      decrease_by     = 1<br>    })<br>  })</pre> | <pre>{<br>  "cpu": {<br>    "decrease_by": 1,<br>    "increase_by": 1,<br>    "lower_threshold": 20,<br>    "upper_threshold": 80<br>  },<br>  "memory": {<br>    "decrease_by": 1,<br>    "increase_by": 1,<br>    "lower_threshold": 20,<br>    "upper_threshold": 70<br>  },<br>  "requests": null<br>}</pre> | no |
| <a name="input_scheduler"></a> [scheduler](#input\_scheduler) | Set the recurrent autoscaling actions | <pre>object({<br>    high_load = optional(object({<br>      start = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      end = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      name    = string<br>      default = number<br>      minimum = number<br>    }), null)<br>    low_load = optional(object({<br>      start = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      end = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      name    = string<br>      default = number<br>      minimum = number<br>    }), null)<br>    normal_load = object({<br>      default = number<br>      minimum = number<br>    })<br>    maximum = optional(number, 30)<br>  })</pre> | <pre>{<br>  "high_load": {<br>    "default": 12,<br>    "end": {<br>      "hour": 22,<br>      "minutes": 59<br>    },<br>    "minimum": 4,<br>    "name": "high_load_profile",<br>    "start": {<br>      "hour": 19,<br>      "minutes": 30<br>    }<br>  },<br>  "low_load": {<br>    "default": 10,<br>    "end": {<br>      "hour": 5,<br>      "minutes": 0<br>    },<br>    "minimum": 2,<br>    "name": "low_load_profile",<br>    "start": {<br>      "hour": 23,<br>      "minutes": 0<br>    }<br>  },<br>  "maximum": 30,<br>  "normal_load": {<br>    "default": 11,<br>    "minimum": 3<br>  }<br>}</pre> | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

No outputs.
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
