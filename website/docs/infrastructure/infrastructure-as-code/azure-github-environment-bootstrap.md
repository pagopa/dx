# Introducing "Azure GitHub Environment Bootstrap" Terraform module to enhance new project startup

The new Terraform module
[`Azure GitHub Environment Bootstrap`](https://github.com/pagopa/dx/blob/main/infra/modules/azure_github_environment_bootstrap)
developed by DevEx team, has finally left the beta status by reaching its first
major version release.

This module is useful for anybody that has just created a new repository and
wants to focus quickly on their goals rather than spending hours in setting up
everything around the new repository. The module focuses on projects which
leverage on Azure, GitHub and a single environment (production). After applying
this module, the repository will have:

- completed the setup needed to launch GitHub workflows
- a dedicated private runner to connect to private Azure resources from GitHub
  pipelines
- an Azure resource group to deploy resources generally contained in
  `infra/resources`
- the required permissions to operate on domain resources
- a secure and smoooth configuration

To accomplish the setup, the module provisions:

- an Azure Container App Job to run workflows in a private runner integrated
  with an Azure VNet
- a federation between the GitHub repository and Azure user-assigned managed
  identities to allow workflows to connect with Azure tenant
- the creation of a project-specific Azure resource group which will contains
  the infrastructure of the entire repository as it will share the same
  lifecycle and IAM setup
- the IAM setup of both team and Azure user-assigned managed identities
  following the [latest DevEx framework](../azure-iam.md)
- the GitHub repository settings according to the best practices found by the DX
  team

As the `Azure GitHub Environment Bootstrap` module is designed to support teams
in new projects development, it is particularly indicated for mono repositories
which traditionally requires more time to be properly prepared: in just few
minutes, the repository will be ready to be used.

On the other hand, the new module may result a bit overwhelming for small
repositories, where you may have only one application. For this reason, the
module
[`azure_federated_identity_with_github`](https://github.com/pagopa/dx/blob/main/infra/modules/azure_federated_identity_with_github)
is still maintained and available, and is suggested for those cases. However,
please note that this design is not advisable and instead it is recommended the
use of mono repositories.

## Getting Started

It is recommended to reference the module via the Terraform Registry, and pin
the major version only:

```hcl
module "repo" {
  source  = "pagopa/dx-azure-github-environment-bootstrap/azurerm"
  version = "~>1"
}
```

Despite the `Azure GitHub Environment Bootstrap` module requires lot of inputs,
its usage remains easy. In fact, lot of values are the same for different
projects under the same product's umbrella, and moreover are well-known by our
user base. The following data is asked:

- the Azure subscription and tenant ids
- the ids of team specific Entra ID groups as expected by
  [DevEx IAM framework](../azure-iam.md)
- the id of an existing Azure Container App Environment
- the details of the Storage Account holding the Terraform state file
- the details of the current repository (name, description, topics, optionally
  reviewers, etc.)
- the ids of the product-shared cloud resources, if any (API Management, Private
  Endpoints, VNet, etc.)

More details about the usage can be found
[here](https://registry.terraform.io/modules/pagopa/dx-azure-github-environment-bootstrap/azurerm/latest).

### Examples

The following repositories have been using the
`Azure GitHub Environment Bootstrap` module since the early stages, and can be
used as examples:

- [IO Messages](https://github.com/pagopa/io-messages/tree/main/infra/repository)
- [IO Wallet](https://github.com/pagopa/io-wallet/tree/main/infra/repository)
- [IO Services CMS](https://github.com/pagopa/io-services-cms/tree/main/infra/repository)
