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

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_id"></a> [app\_service\_id](#input\_app\_service\_id) | Set the App Service or Function App Id to monitor | `string` | n/a | yes |
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | Set the App Service Plan Id to apply the autoscaler to | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_scale_metrics"></a> [scale\_metrics](#input\_scale\_metrics) | (Optional) Set the metrics to monitor. CPU and Memory are mandatory, Requests is not. Each attribute has a default value that can be overridden | <pre>object({<br>    requests = optional(object({<br>      upper_threshold = number<br>      lower_threshold = number<br>      increase_by     = number<br>      decrease_by     = number<br>    }), null)<br>    cpu = optional(object({<br>      upper_threshold = optional(number, 80)<br>      lower_threshold = optional(number, 20)<br>      increase_by     = optional(number, 1)<br>      decrease_by     = optional(number, 1)<br>      }), {<br>      upper_threshold = 80<br>      lower_threshold = 20<br>      increase_by     = 1<br>      decrease_by     = 1<br>    })<br>    memory = optional(object({<br>      upper_threshold = optional(number, 70)<br>      lower_threshold = optional(number, 20)<br>      increase_by     = optional(number, 1)<br>      decrease_by     = optional(number, 1)<br>      }), {<br>      upper_threshold = 70<br>      lower_threshold = 20<br>      increase_by     = 1<br>      decrease_by     = 1<br>    })<br>  })</pre> | <pre>{<br>  "cpu": {<br>    "decrease_by": 1,<br>    "increase_by": 1,<br>    "lower_threshold": 20,<br>    "upper_threshold": 80<br>  },<br>  "memory": {<br>    "decrease_by": 1,<br>    "increase_by": 1,<br>    "lower_threshold": 20,<br>    "upper_threshold": 70<br>  },<br>  "requests": null<br>}</pre> | no |
| <a name="input_scheduler"></a> [scheduler](#input\_scheduler) | Set the recurrent autoscaling actions | <pre>object({<br>    high_load = optional(object({<br>      start = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      end = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      name    = string<br>      default = number<br>      minimum = number<br>      maximum = number<br>    }), null)<br>    low_load = optional(object({<br>      start = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      end = object({<br>        hour    = number<br>        minutes = number<br>      })<br>      name    = string<br>      default = number<br>      minimum = number<br>      maximum = number<br>    }), null)<br>    normal_load = object({<br>      default = number<br>      minimum = number<br>      maximum = number<br>    })<br>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

No outputs.
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
