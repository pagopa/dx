---
sidebar_position: 2
---

# Infrastructure Folder Structure

Each GitHub repository should follow the same folder structure to hold
infrastructure as code sources (Terraform HCL).

Everything should be placed under an `infra` folder at the root of the
repository. This folder should contain multiple Terraform configurations:

- `repository`: This folder contains the settings for the current GitHub
  repository, which are managed using Terraform. The suggestion is to use the
  [github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/github-environment-bootstrap/github/latest)
  module to manage the repository settings.
- `bootstrapper`: This folder contains the definition of the
  [azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
  (or similarly for other cloud providers) to create:
  - A private GitHub runner, which can be used to perform operations against
    network-isolated resources.
  - The identities used by the GitHub Actions workflows to perform operations
    against Azure resources.
  - The GitHub environments containing the information about the target Azure
    Subscription and identities.
- `core`: (Optional) This folder contains the definition of the core resources
  that are shared for the whole subscription, such as the Azure Key Vaults and
  the Log Analytics Workspace. As the base configuration of the subscription, it
  is usually only configured once in the central repository of a product (e.g.
  `io-infra` as the central repository for the IO product).
- `resources`: This folder contains the actual definitions of resources orgnized
  into modules and environments.

The configurations are specific to an environment and are located in the `<env>`
subfolder. Each configuration can be used for multiple CSP regions.

## Example

```
infra/
├─ bootstrapper/
│  ├─ prod/
│  │  ├─ main.tf
│  ├─ dev/
│  │  ├─ main.tf
├─ core/
│  ├─ prod/
│  │  ├─ main.tf
│  ├─ dev/
│  │  ├─ main.tf
├─ repository/
│  ├─ main.tf
├─ resources/
│  ├─ _modules/
│  │  ├─ functions/
│  │  │   ├─ main.tf
│  │  │   ├─ outputs.tf
│  │  │   ├─ inputs.tf
│  │  ├─ resource-groups/
│  │  │   ├─ main.tf
│  │  │   ├─ outputs.tf
│  │  │   ├─ inputs.tf
│  ├─ dev/
│  │  |  ├─ main.tf
│  ├─ prod/
│  │  |  ├─ main.tf
```
