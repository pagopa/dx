---
sidebar_position: 2
sidebar_label: Infrastructure Folder Structure
---

# Infrastructure Folder Structure

Each repository should follow the same folder structure to hold infrastructure resources.

Everything should be put under a `infra` folder at the root of the repo. This should then contain multiple Terraform configuration:

- `identity`: contains the Azure Managed Identities federated with GitHub. Useful to perform Azure logins in GitHub Actions.
- `repository`: settings of the current GitHub repository, managed via Terraform.
- `github-runner`: (Optional) The definition to create a private GitHub runner to perform operation against network-isolated resources.
- `resources`: contains the actual definition of resources.

Definitions are intended to work for an environment, and are located in the `<env>` subfolder. Each configuration could use multiple Azure regions.

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
│  │  ├─ azure-functions/
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
