---
sidebar_label: Creating a brand-new Mono-Repository on GitHub using DX tools
---

# Creating a brand-new Mono-Repository on GitHub using DX tools

This guide provides step-by-step instructions for creating and setting up a new
mono-repository on GitHub using DX tools.

:::info

Currently, only projects with a single environment powered by Azure are
supported. Additional tooling to support other scenarios is under development.

:::

## Repository Setup

Start by creating the repository on GitHub. Then, follow these steps to complete
the configuration.

### Repository Access Control

Ensure appropriate access control for your repository:

- Grant access to your peers who need it.
- Always provide `Admin` access to:
  - Cloud engineers (`engineering-team-cloud-eng`) to get support of DX tooling
    in future.
  - The BOT user associated with your product.

### CODEOWNERS Definition

Define a `CODEOWNERS` file to manage repository ownership. A common setup is:

- Your team has control over the entire repository (`*`).
- Cloud engineers have control over the `infra` and `.github` paths.

Example `CODEOWNERS` file:

```md
# See https://help.github.com/en/articles/about-code-owners#example-of-a-codeowners-file

* <your-team>
/infra/ <your-team> @engineering-team-cloud-eng
.github/ <your-team> @engineering-team-cloud-eng
```

### Creation of Dotfiles

Create the following dotfiles at the root of your repository:

- `.terraform-version`: Specify the Terraform version to use (typically
  [the latest available](https://developer.hashicorp.com/terraform/install?product_intent=terraform)).
- `.gitignore`: Add rules to manage Terraform files
  ([example](https://github.com/pagopa/dx-typescript/blob/main/.gitignore#L1)).
- `.pre-commit-config.yaml`: Define pre-commit hooks
  ([example](https://github.com/pagopa/dx/blob/main/.pre-commit-config.yaml)).
- `.editorconfig`: Enforce consistent coding styles
  ([example](https://github.com/pagopa/dx-typescript/blob/main/.editorconfig)).
- `.tflint.hcl`: Configure TFLint for Terraform linting
  ([example](https://github.com/pagopa/dx/blob/main/.tflint.hcl)).
- `.trivyignore`: Define rules for Trivy vulnerability scanning
  ([example](https://github.com/pagopa/dx/blob/main/.trivyignore)).

### Creation of GitHub PAT

If you do not already have a Personal Access Token (PAT), follow these steps:

1. Go to your GitHub settings.
2. Under `Developer settings`, create a new fine-grained PAT with the following
   permissions:
   - `read`: `metadata`
   - `read+write`: `variables`, `administration`, `environments`, `secrets`

:::warning

Ensure the PAT has access to your repository.

:::

### GitHub Settings and Link to Azure

Follow GitHub best practices and connect your repository to Azure using the
[azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
Terraform module.

1. Create a folder named `infra/bootstrapper` at the root of your repository.
2. Define the module in this folder. Refer to the
   [module README](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest?tab=readme)
   for detailed instructions.

For more information, see the
[availability blog post](../articles/azure-github-environment-bootstrap.md) and
the [IAM Framework documentation](./azure/azure-iam.md).
