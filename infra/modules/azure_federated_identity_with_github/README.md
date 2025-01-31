# DX - Azure Federated Identity with Github Module

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_federated_cd_identity"></a> [federated\_cd\_identity](#module\_federated\_cd\_identity) | github.com/pagopa/terraform-azurerm-v3//github_federated_identity | v8.51.0 |
| <a name="module_federated_ci_identity"></a> [federated\_ci\_identity](#module\_federated\_ci\_identity) | github.com/pagopa/terraform-azurerm-v3//github_federated_identity | v8.51.0 |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_continuos_delivery"></a> [continuos\_delivery](#input\_continuos\_delivery) | Continuos Delivery identity properties, such as repositories to federated with and RBAC roles | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Contributor"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_continuos_integration"></a> [continuos\_integration](#input\_continuos\_integration) | Continuos Integration identity properties, such as repositories to federated with and RBAC roles | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Reader",<br/>      "Reader and Data Access",<br/>      "PagoPA IaC Reader",<br/>      "DocumentDB Account Contributor",<br/>      "PagoPA API Management Service List Secrets"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_domain"></a> [domain](#input\_domain) | (Optional) Domain of the project | `string` | `""` | no |
| <a name="input_env"></a> [env](#input\_env) | Environment name | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Environment short name | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region for the Managed Identity | `string` | `"italynorth"` | no |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | Project prefix | `string` | n/a | yes |
| <a name="input_repositories"></a> [repositories](#input\_repositories) | List of repositories to federate | `list(string)` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_federated_cd_identity"></a> [federated\_cd\_identity](#output\_federated\_cd\_identity) | Data about the Continuos Delivery managed identity created |
| <a name="output_federated_ci_identity"></a> [federated\_ci\_identity](#output\_federated\_ci\_identity) | Data about the Continuos Integration managed identity created |
<!-- END_TF_DOCS -->
