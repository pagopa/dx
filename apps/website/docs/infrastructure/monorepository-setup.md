---
sidebar_label: Creating a Brand-New Mono-Repository on GitHub Using DX Tools
---

# Creating a Brand-New Mono-Repository on GitHub Using DX Tools

This guide provides step-by-step instructions for creating and setting up a new
mono-repository on GitHub using DX tools.

:::info

Currently, only projects with a single environment powered by Azure are
supported. Additional tooling to support other scenarios is under development.

:::

## Setup GitHub Repository

Start by creating the repository on GitHub:

```bash
gh repo create <org>/<repo-name> \
  --add-readme \
  --description <some-text> \
  --disable-wiki \
  --public \
  --clone
```

Then, follow these steps to complete the configuration.

### Ensure an Appropriate Repository Access Control

To manage the access control for your repository, follow:

- [Grant access](https://pagopa.atlassian.net/wiki/search?text=github%20gestione%20utenze)
  to your peers who need it.
- Always provide `Admin` access to:
  - Cloud engineers (`engineering-team-cloud-eng`) to ensure future support for
    DX tooling.
  - The
    [GitHub bot user associated with your product](https://pagopa.atlassian.net/wiki/search?text=github%20bot%20for%20projects)

### Define CODEOWNERS

Define a `CODEOWNERS` file to manage repository ownership. A common setup is:

- Your team has control over the entire repository (`*`).
- Both your team and cloud engineers have control over the `infra` and `.github`
  paths.

Example `CODEOWNERS` file:

```md
# See https://help.github.com/en/articles/about-code-owners#example-of-a-codeowners-file

- <your-team>
  /infra/ <your-team> @engineering-team-devex 
  .github/ <your-team> @engineering-team-devex
```

### Create Dot Files

Create the following dotfiles at the root of your repository:

- `.terraform-version`: Specify the Terraform version to use (typically
  [the latest available](https://developer.hashicorp.com/terraform/install?product_intent=terraform)).
- `.gitignore`: Add rules to manage Terraform files.
- `.pre-commit-config.yaml`: Define pre-commit hooks.
- `.editorconfig`: Enforce consistent coding styles.
- `.tflint.hcl`: Configure TFLint for Terraform linting.
- `.trivyignore`: Define rules for Trivy vulnerability scanning.

### Authenticating with GitHub for Terraform Operations

To apply changes to your repository via Terraform, you need to have the
[right permissions](https://github.com/orgs/pagopa/repositories?type=source&q=eng-github-au)
as well as your local CLI authenticate within GitHub. The latter is achievable
by using either [gh cli](https://cli.github.com/) or a PAT token. Using the GH
CLI is recommended over a PAT token. recommended.

#### Authenticate with GH CLI (recommended)

Open your shell and run the command:

```bash

gh auth login

```

Follow the instructions on screen and you are ready to go.

#### Authenticate with PAT token

To apply changes to your repository via Terraform, you need a Personal Access
Token (PAT) for authentication. A single PAT with the following permissions is
required for all repositories managed through Terraform:

- `read`: `metadata`
- `read+write`: `variables`, `administration`, `environments`, `secrets`

If you already have a PAT configured with these permissions, you may skip the
next section.

##### Create the GitHub PAT

If you do not already have a Personal Access Token (PAT), follow these steps:

1. Go to your GitHub settings, under `Developer settings`, and create a new
   fine-grained PAT:
   - Add these permissions:
     - `read`: `metadata`
     - `read+write`: `variables`, `administration`, `environments`, `secrets`
   - Select `Only select repositories` and add the new repository.
   - Add a meaningful description like "PAT to manage GitHub locally via
     Terraform."
2. Set in your local environment the variable `GITHUB_TOKEN` with the generated
   PAT value in your CLI profile.

##### Update the GitHub PAT

If you already have the PAT in both your GitHub account and your CLI profile,
ensure that the new repository is accessible from that PAT.

1. Go to your GitHub settings, under `Developer settings`, and select the
   existing fine-grained PAT.
2. Under `Only select repositories`, add your new repository.

:::warning

PATs have an expiration date.
[Be sure to renew them periodically](https://pagopa.atlassian.net/wiki/search?text=github%20bot%20pat).

:::

### Link GitHub to Azure

Follow GitHub best practices and connect your repository to Azure using the
[azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
Terraform module.

1. Create a folder named `infra/bootstrapper` at the root of your repository.
2. Define the module in this folder. Refer to the
   [module README](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest?tab=readme)
   for detailed instructions.

For more information, see the
[availability blog post](https://pagopa.github.io/dx/blog/devex-azure-bootstrap-0.1-alpha)
and the [IAM Framework documentation](./azure/azure-iam.md).
