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
  - Cloud engineers (`engineering-team-cloud-eng`) to get future support of DX
    tooling.
  - The BOT user associated with your product.

### CODEOWNERS Definition

Define a `CODEOWNERS` file to manage repository ownership. A common setup is:

- Your team has control over the entire repository (`*`).
- Both your team and cloud engineers have control over the `infra` and `.github`
  paths.

Example `CODEOWNERS` file:

```md
# See https://help.github.com/en/articles/about-code-owners#example-of-a-codeowners-file

- <your-team>
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

### GitHub PAT

To apply changes to your repository via Terraform, you need a Personal Access
Token (PAT) as authentication mechanism. You need a single PAT for all
repositories you manage via Terraform. Then, skip the next paragraph if you
already a have a PAT in your account with the permissions listed below.

#### Creation of GitHub PAT

If you do not already have a Personal Access Token (PAT), follow these steps:

1. Go to your GitHub settings, under `Developer settings`, create a new
   fine-grained PAT:

- Add the the following permissions:
- `read`: `metadata`
- `read+write`: `variables`, `administration`, `environments`, `secrets`
- Select `Only select repositories` and add the new repository
- Add a meaningful description like "PAT to manage GitHub locally via Terraform"

2. Set the variable `GITHUB_TOKEN` with the generated PAT value to your CLI
   profile.

#### Update of GitHub PAT

If you already have the PAT in both your GitHub account and your CLI profile, be
sure that the new repository is accessible from that PAT.

1. Go to your GitHub settings, under `Developer settings`, select the existing
   fine-grained PAT:
2. Under `Only select repository`, select your new repository

:::warning

PATs have an expiration date. Be sure to periodically renew it.

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
