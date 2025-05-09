---
sidebar_position: 2
---

# Infrastructure Folder Structure

Each GitHub repository should follow the same folder structure to hold
infrastructure as code sources (Terraform HCL).

Everything should be placed under an `infra` folder at the root of the
repository. This folder should contain multiple Terraform configurations:

- `identity`: This folder contains the Cloud Service Provider (CSP) Managed
  Identities that are federated with GitHub. These identities are useful for
  letting GitHub Actions perform operations against CSP resources.
- `repository`: This folder contains the settings for the current GitHub
  repository, which are managed using Terraform.
- `github-runner`: (Optional) This folder contains the definition to create a
  private GitHub runner, which can be used to perform operations against
  network-isolated resources.
- `resources`: This folder contains the actual definitions of resources orgnized
  into modules and environments.

The configurations are specific to an environment and are located in the `<env>`
subfolder. Each configuration can be used for multiple CSP regions.

## Example

```
infra/
├─ identity/
│  ├─ prod/
│  │  ├─ main.tf
├─ github-runner/
│  ├─ prod/
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
