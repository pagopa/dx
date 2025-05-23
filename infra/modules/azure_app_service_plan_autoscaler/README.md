# DX - Azure App Service Plan Autoscaler

This Terraform module provisions an Azure App Service Plan Autoscaler with configurable scaling profiles and metrics monitoring.

## Features

- **Dynamic Scaling**: Automatically scales App Services or Function Apps based on CPU, memory, and request metrics.
- **Customizable Profiles**: Supports high-load, low-load, normal-load, and spot-load scaling profiles.
- **Metric-Based Rules**: Configurable thresholds and actions for CPU, memory, and request metrics.
- **Recurrent Scheduling**: Define time-based scaling profiles for predictable workloads.
- **Flexible Targeting**: Supports both App Services and Function Apps as scaling targets.
- **Shared Plan Support**: Monitor and scale multiple services in the same App Service Plan.

## Usage Example

A complete example of how to use this module can be found in the [examples/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-app-service-plan-autoscaler/tree/main/examples/complete) directory.
For an example of how to use this module with multiple services in a shared plan, see the [examples/shared](https://github.com/pagopa-dx/terraform-azurerm-azure-app-service-plan-autoscaler/tree/main/examples/shared) directory.

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-service-plan-autoscaler/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-service-plan-autoscaler%2Fazurerm%2Flatest)

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.100.0, < 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |
| [azurerm_linux_function_app.function_apps](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/linux_function_app) | data source |
| [azurerm_linux_web_app.app_services](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/linux_web_app) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | The id of the app service plan containing the service to autoscale. | `string` | n/a | yes |
| <a name="input_autoscale_name"></a> [autoscale\_name](#input\_autoscale\_name) | Override auto generated name for the autoscaler resource | `string` | `null` | no |
| <a name="input_location"></a> [location](#input\_location) | The location of the app service plan. Allowed values are "italynorth", "westeurope", and "germanywestcentral". | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_scale_metrics"></a> [scale\_metrics](#input\_scale\_metrics) | Set the metrics to monitor. CPU is mandatory, Memory and Requests are not. Each attribute has a default value that can be overridden | <pre>object({<br/>    requests = optional(object({<br/>      upper_threshold           = number<br/>      lower_threshold           = number<br/>      increase_by               = number<br/>      decrease_by               = number<br/>      cooldown_increase         = optional(number, 1)<br/>      cooldown_decrease         = optional(number, 10)<br/>      statistic_increase        = optional(string, "Average")<br/>      statistic_decrease        = optional(string, "Average")<br/>      time_aggregation_increase = optional(string, "Average")<br/>      time_aggregation_decrease = optional(string, "Average")<br/>      time_window_increase      = optional(number, 1)<br/>      time_window_decrease      = optional(number, 1)<br/>    }), null)<br/>    cpu = optional(object({<br/>      upper_threshold           = optional(number, 80)<br/>      lower_threshold           = optional(number, 20)<br/>      increase_by               = optional(number, 1)<br/>      decrease_by               = optional(number, 1)<br/>      cooldown_increase         = optional(number, 1)<br/>      cooldown_decrease         = optional(number, 20)<br/>      statistic_increase        = optional(string, "Average")<br/>      statistic_decrease        = optional(string, "Average")<br/>      time_aggregation_increase = optional(string, "Average")<br/>      time_aggregation_decrease = optional(string, "Average")<br/>      time_window_increase      = optional(number, 5)<br/>      time_window_decrease      = optional(number, 5)<br/>    }), {})<br/>    memory = optional(object({<br/>      upper_threshold           = optional(number, 70)<br/>      lower_threshold           = optional(number, 20)<br/>      increase_by               = optional(number, 1)<br/>      decrease_by               = optional(number, 1)<br/>      cooldown_increase         = optional(number, 1)<br/>      cooldown_decrease         = optional(number, 5)<br/>      statistic_increase        = optional(string, "Average")<br/>      statistic_decrease        = optional(string, "Average")<br/>      time_aggregation_increase = optional(string, "Average")<br/>      time_aggregation_decrease = optional(string, "Average")<br/>      time_window_increase      = optional(number, 5)<br/>      time_window_decrease      = optional(number, 5)<br/>    }), null)<br/>  })</pre> | <pre>{<br/>  "cpu": {<br/>    "cooldown_decrease": 20,<br/>    "cooldown_increase": 1,<br/>    "decrease_by": 1,<br/>    "increase_by": 1,<br/>    "lower_threshold": 20,<br/>    "statistic_decrease": "Average",<br/>    "statistic_increase": "Average",<br/>    "time_aggregation_decrease": "Average",<br/>    "time_aggregation_increase": "Average",<br/>    "time_window_decrease": 5,<br/>    "time_window_increase": 5,<br/>    "upper_threshold": 80<br/>  },<br/>  "memory": null,<br/>  "requests": null<br/>}</pre> | no |
| <a name="input_scheduler"></a> [scheduler](#input\_scheduler) | Set the recurrent autoscaling profiles, including start and end time ([hh]:[mm]), the minimum and maximum number of instances and the fallback ("default") value (used when metrics are not available for some technical issue). Outside of low/high load profile time span, "normal" load values are used. Each default value can be overridden. | <pre>object({<br/>    high_load = optional(object({<br/>      start = object({<br/>        hour    = number<br/>        minutes = number<br/>      })<br/>      end = object({<br/>        hour    = number<br/>        minutes = number<br/>      })<br/>      name    = string<br/>      default = number<br/>      minimum = number<br/>    }), null)<br/>    low_load = optional(object({<br/>      start = object({<br/>        hour    = number<br/>        minutes = number<br/>      })<br/>      end = object({<br/>        hour    = number<br/>        minutes = number<br/>      })<br/>      name    = string<br/>      default = number<br/>      minimum = number<br/>    }), null)<br/>    spot_load = optional(object({<br/>      start_date = string<br/>      end_date   = string<br/>      name       = string<br/>      default    = number<br/>      minimum    = number<br/>    }), null)<br/>    normal_load = object({<br/>      default = number<br/>      minimum = number<br/>    })<br/>    maximum = optional(number, 30)<br/>  })</pre> | <pre>{<br/>  "high_load": {<br/>    "default": 12,<br/>    "end": {<br/>      "hour": 22,<br/>      "minutes": 59<br/>    },<br/>    "minimum": 4,<br/>    "name": "high_load_profile",<br/>    "start": {<br/>      "hour": 19,<br/>      "minutes": 30<br/>    }<br/>  },<br/>  "low_load": {<br/>    "default": 10,<br/>    "end": {<br/>      "hour": 5,<br/>      "minutes": 0<br/>    },<br/>    "minimum": 2,<br/>    "name": "low_load_profile",<br/>    "start": {<br/>      "hour": 23,<br/>      "minutes": 0<br/>    }<br/>  },<br/>  "maximum": 30,<br/>  "normal_load": {<br/>    "default": 11,<br/>    "minimum": 3<br/>  }<br/>}</pre> | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_target_service"></a> [target\_service](#input\_target\_service) | The target services to autoscale. You can specify multiple app services and/or function apps that share the same plan. For each service, the id and name attributes are optional, but at least one of them must be provided. Use id if the target service is being created in the same plan. | <pre>object({<br/>    app_services = optional(list(object({<br/>      id   = optional(string, null)<br/>      name = optional(string, null)<br/>    })), [])<br/>    function_apps = optional(list(object({<br/>      id   = optional(string, null)<br/>      name = optional(string, null)<br/>    })), [])<br/>  })</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
