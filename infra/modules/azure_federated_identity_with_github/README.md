# DX - Azure Federated Identity with Github Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-federated-identity-with-github/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-federated-identity-with-github%2Fazurerm%2Flatest)

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa-dx/azure-naming-convention/azurerm | ~> 0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_federated_identity_credential.cd_github](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_federated_identity_credential.ci_github](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_role_assignment.cd_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.cd_subscription](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.ci_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.ci_subscription](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_user_assigned_identity.cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_user_assigned_identity.ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_resource_group.cd_details](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_resource_group.ci_details](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_continuos_delivery"></a> [continuos\_delivery](#input\_continuos\_delivery) | Continuos Delivery identity properties, such as repositories to federated with and RBAC roles | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Contributor"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_continuos_integration"></a> [continuos\_integration](#input\_continuos\_integration) | Continuos Integration identity properties, such as repositories to federated with and RBAC roles | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Reader",<br/>      "Reader and Data Access",<br/>      "PagoPA IaC Reader",<br/>      "DocumentDB Account Contributor",<br/>      "PagoPA API Management Service List Secrets"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_identity_type"></a> [identity\_type](#input\_identity\_type) | Scope of the identities to create | `string` | `"infra"` | no |
| <a name="input_repository"></a> [repository](#input\_repository) | Repositories to federate | <pre>object({<br/>    owner = optional(string, "pagopa")<br/>    name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | Id of the current subscription | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_federated_cd_identity"></a> [federated\_cd\_identity](#output\_federated\_cd\_identity) | Data about the Continuos Delivery managed identity created |
| <a name="output_federated_ci_identity"></a> [federated\_ci\_identity](#output\_federated\_ci\_identity) | Data about the Continuos Integration managed identity created |
<!-- END_TF_DOCS -->
