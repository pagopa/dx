# DX - Azure Federated Identity with Github Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-federated-identity-with-github/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-federated-identity-with-github%2Fazurerm%2Flatest)

This Terraform module provisions Azure Federated Identities for GitHub Actions, enabling secure and seamless integration between Azure and GitHub repositories.

## Features

- **Continuous Integration (CI) Identity**: Creates a managed identity for CI pipelines with customizable RBAC roles.
- **Continuous Delivery (CD) Identity**: Creates a managed identity for CD pipelines with customizable RBAC roles.
- **Flexible Role Assignments**: Supports role assignments at both subscription and resource group levels.
- **GitHub Federation**: Configures federated identity credentials for GitHub repositories.
- **Dynamic Configuration**: Allows enabling/disabling CI/CD identities and customizing their roles.

## Usage Example

Below is an example of how to use this module to create federated identities for both CI and CD pipelines:

```hcl
module "azure_federated_identity_with_github" {
  source  = "pagopa-dx/azure-federated-identity-with-github/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "example"
    instance_number = "01"
  }

  resource_group_name = "dx-d-itn-example-rg-01"
  subscription_id     = data.azurerm_subscription.current.id

  repository = {
    name  = "dx"
    owner = "example"
  }

  continuos_integration = {
    enable = true
    roles = {
      subscription = ["Reader"]
      resource_groups = {
        "dx-d-itn-example-rg-01" = ["Storage Blob Data Contributor"]
      }
    }
  }

  continuos_delivery = {
    enable = true
    roles = {
      subscription = ["Contributor"]
      resource_groups = {
        "dx-d-itn-example-rg-01" = ["Storage Blob Data Contributor"]
      }
    }
  }

  tags = {}
}
```

## Diagram
<!-- START_TF_GRAPH -->
<!-- END_TF_GRAPH -->

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.7, < 1.0.0 |

## Modules

No modules.

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
| <a name="input_continuos_delivery"></a> [continuos\_delivery](#input\_continuos\_delivery) | Continuos Delivery (CD) identity properties, such as repositories to federated with and RBAC roles at the subscription and resource group levels. | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Contributor"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_continuos_integration"></a> [continuos\_integration](#input\_continuos\_integration) | Continuos Integration (CI) identity properties, such as repositories to federated with and RBAC roles at the subscription and resource group levels. | <pre>object({<br/>    enable = bool<br/>    roles = optional(object({<br/>      subscription    = set(string)<br/>      resource_groups = map(list(string))<br/>    }))<br/>  })</pre> | <pre>{<br/>  "enable": true,<br/>  "roles": {<br/>    "resource_groups": {<br/>      "terraform-state-rg": [<br/>        "Storage Blob Data Contributor"<br/>      ]<br/>    },<br/>    "subscription": [<br/>      "Reader",<br/>      "Reader and Data Access",<br/>      "PagoPA IaC Reader",<br/>      "DocumentDB Account Contributor",<br/>      "PagoPA API Management Service List Secrets"<br/>    ]<br/>  }<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Environment-specific values used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_identity_type"></a> [identity\_type](#input\_identity\_type) | Specifies the scope of the identities to create. Supported values are 'infra', 'opex', and 'app'. | `string` | `"infra"` | no |
| <a name="input_repository"></a> [repository](#input\_repository) | Details of the GitHub repository to federate with. 'owner' defaults to 'pagopa' if not specified. | <pre>object({<br/>    owner = optional(string, "pagopa")<br/>    name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the Azure subscription where resources will be deployed. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags. | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_federated_cd_identity"></a> [federated\_cd\_identity](#output\_federated\_cd\_identity) | Data about the Continuos Delivery managed identity created |
| <a name="output_federated_ci_identity"></a> [federated\_ci\_identity](#output\_federated\_ci\_identity) | Data about the Continuos Integration managed identity created |
<!-- END_TF_DOCS -->
