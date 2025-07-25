---
sidebar_label: Creating a Brand-New Mono-Repository on GitHub Using DX Tools
sidebar_position: 1
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

To ensure proper access control, follow these steps:

- [Grant access](https://pagopa.atlassian.net/wiki/search?text=github%20gestione%20utenze)
  to your peers who need it.
- Provide `Admin` access to the
  [GitHub bot user associated with your product](https://pagopa.atlassian.net/wiki/search?text=github%20bot%20for%20projects)
- Optionally: provide `Admin` access to `@engineering-team-devex` to ensure
  future support for DX tooling.

### Define CODEOWNERS

Define a `CODEOWNERS` file to manage repository ownership.

See
https://help.github.com/en/articles/about-code-owners#example-of-a-codeowners-file

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

Changes to your repository via Terraform are applied from your local machine
using the `terraform apply` command. This requires authentication with GitHub to
ensure that the changes are applied correctly.

Before proceeding, ensure that you and your team have the
[required permissions](https://github.com/orgs/pagopa/repositories?type=source&q=eng-github-au)
to make changes to the repository.

Then, use one of the following methods to authenticate with GitHub:

1. Using the [GitHub CLI](https://cli.github.com/) (recommended)
2. Using a Personal Access Token (PAT)

#### Authenticate with GH CLI (recommended)

Open your shell and run the command:

```bash

gh auth login

```

Follow the instructions on screen and you are ready to go.

#### Authenticate with PAT token

To apply changes to your repository via Terraform, you can authenticate using a
Personal Access Token (PAT). A single PAT with the following permissions is
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
2. In your local environment, set the `GITHUB_TOKEN` variable to the value of
   the generated PAT.

##### Add a new repository to the GitHub PAT

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
[related blog post](https://pagopa.github.io/dx/blog/devex-azure-bootstrap-0.1-alpha)
and the [IAM Framework documentation](../infrastructure/azure/azure-iam.md).

:::info[Azure Permissions for Initial Setup]

The initial `terraform apply` for the Bootstrap module must be run locally by an
Azure account that has the `Role Based Access Control Administrator` and
`Contributor` roles assigned at the subscription level.

Within the PagoPA context, you can obtain the necessary RBAC role by opening a
Pull Request against the company Azure authorization repository, adding this
administrative user to the `io-p-adgroup-rbac-admins` team. For example:

```terraform
  ...
  {
    name = "io-p-adgroup-rbac-admins"
    members = [
      ...
      "eng.lead.or.delegate@example.com", // Add the user's email here
      ...
    ],
    roles = [
      "Role Based Access Control Administrator",
    ],
  },
  ...
```

This step is crucial for the `azure-github-environment-bootstrap` module to
correctly set up the necessary resources and permissions in Azure during the
first local apply. Subsequent applies can be automated with a GitHub Workflow.
:::
