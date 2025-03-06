# DX - Azure Container APP

## Overview

This Terraform module deploys an Azure Container App in a provided Azure Container App Environment. It supports System Assigned Managed Identity and configurable scaling options.

## Resources Created

- `azurerm_container_app`: Deploys a containerized application in the specified environment.
- `azurerm_private_dns_a_record`: Creates a private DNS A record for the container app.

## Features

- Supports different templates configuration via a map (`container_app_templates`).
- With tier specification (xs, s, m, or l) creates container app with different replicas, CPU, and memory settings:

```json
"xs" = {
  cpu    = 0.25
  memory = "0.5Gi"
  replicas = {
    min = 0
    max = 1
  }
}
"s" = {
  cpu    = 0.5
  memory = "1Gi"
  replicas = {
    min = 1
    max = 1
  }
}
"m" = {
  cpu    = 1.25
  memory = "2.5Gi"
  replicas = {
    min = 1
    max = 2
  }
}
"l" = {
  cpu    = 2
  memory = "4Gi"
  replicas = {
    min = 2
    max = 4
  }
}
```

- Managed Identity (System Assigned) for secure authentication.
- Probes for liveness, readiness, and startup to ensure container health.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app) | resource |
| [azurerm_private_dns_a_record.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_environment"></a> [container\_app\_environment](#input\_container\_app\_environment) | The container app environment to deploy the container app to. | <pre>object({<br/>    id = string<br/>    private_dns_zone = object({<br/>      name                = string<br/>      resource_group_name = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_container_app_templates"></a> [container\_app\_templates](#input\_container\_app\_templates) | List of container app templates | <pre>list(object({<br/>    image        = string<br/>    name         = optional(string, "")<br/>    app_settings = optional(map(string), {})<br/><br/>    liveness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 5)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      host             = optional(string)<br/>      initial_delay    = optional(number, 1)<br/>      interval_seconds = optional(number, 10)<br/>      path             = optional(string)<br/>      port             = optional(number, 8080)<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), {})<br/><br/>    readiness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      host                    = optional(string)<br/>      interval_seconds        = optional(number, 10)<br/>      path                    = optional(string)<br/>      port                    = optional(number, 8080)<br/>      success_count_threshold = optional(number, 3)<br/>      timeout                 = optional(number, 5)<br/>      transport               = optional(string, "HTTP")<br/>    }), {})<br/><br/>    startup_probe = optional(object({<br/>      failure_count_threshold = optional(number, 30)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      host             = optional(string)<br/>      interval_seconds = optional(number, 10)<br/>      path             = optional(string)<br/>      port             = optional(number, 8080)<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), {})<br/>  }))</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | The offer type for the Container. Valid values are 'xs', 's', 'm' and 'l'. | `string` | `"s"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
| <a name="output_url"></a> [url](#output\_url) | n/a |
<!-- END_TF_DOCS -->
