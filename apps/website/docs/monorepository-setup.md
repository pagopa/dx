---
sidebar_position: 2
---

# Creating a DX-Ready Monorepo on GitHub

This guide provides step-by-step instructions for creating and setting up a new
mono-repository on GitHub using DX tools.

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
[GitHub documentation](https://help.github.com/en/articles/about-code-owners#example-of-a-codeowners-file)

### Create Dot Files

Create the following dotfiles at the root of your repository:

- `.terraform-version`: Specify the Terraform version to use (typically
  [the latest available](https://developer.hashicorp.com/terraform/install?product_intent=terraform)).
- `.gitignore`: Add rules to manage Terraform files.
- `.pre-commit-config.yaml`: Define pre-commit hooks.
- `.editorconfig`: Enforce consistent coding styles.
- `.tflint.hcl`: Configure TFLint for Terraform linting.
- `.trivyignore`: Define rules for Trivy vulnerability scanning.

### Managing GitHub Repository via Terraform

It is recommended to manage your GitHub repository configuration using
Terraform. This allows you to maintain your repository settings as code,
ensuring consistency and ease of management. The module
[github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/github-environment-bootstrap/github/latest)
streamlines this process.

1. Create a folder named `infra/repository` at the root of your repository.
2. Define the module in this folder. Refer to the
   [module README](https://registry.terraform.io/modules/pagopa-dx/github-environment-bootstrap/github/latest?tab=readme)
   for detailed instructions.

#### Authenticating with GitHub for Terraform Operations

Changes to your repository via Terraform are applied from your local machine
using the `terraform apply` command. This requires authentication with GitHub to
ensure that the changes are applied correctly.

Before proceeding, ensure that you and your team have the
[required permissions](https://github.com/orgs/pagopa/repositories?type=source&q=eng-github-au)
to make changes to the repository.

Then, use one of the following methods to authenticate with GitHub:

1. Using the [GitHub CLI](https://cli.github.com/) (recommended)
2. Using a Personal Access Token (PAT)

##### Authenticate with GH CLI (recommended)

Open your shell and run the command:

```bash

gh auth login

```

Follow the instructions on screen and you are ready to go.

##### Authenticate with PAT token

To apply changes to your repository via Terraform, you can authenticate using a
Personal Access Token (PAT). A single PAT with the following permissions is
required for all repositories managed through Terraform:

- `read`: `metadata`
- `read+write`: `variables`, `administration`, `environments`, `secrets`

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

### Link GitHub to AWS, Azure or both {#link-github-to-csp}

:::info[Requirements]

Before starting, ensure the Key Vault referenced in
`github_private_runner.key_vault` contains the following secrets for GitHub App
authentication:

- `github-runner-app-id`: the numeric GitHub App ID
- `github-runner-app-installation-id`: the installation ID of the GitHub App on
  the target organization
- `github-runner-app-key`: the private key of the GitHub App in PEM format

See [Obtaining GitHub App credentials](#obtaining-github-app-credentials) for
step-by-step instructions on how to create a GitHub App and retrieve these
values.

:::

Once the GitHub repository is created, link it to your cloud provider(s) using
the proper Terraform module:

1. Create a folder named `infra/bootstrapper` at the root of your repository.
2. For AWS, use
   [aws-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/aws-github-environment-bootstrap/aws/latest)
3. For Azure, use
   [azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
   and set `use_github_app = true` inside `github_private_runner`:

   ```hcl
   module "bootstrap" {
     source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
     version = "~> 3.0"

     # ... other required variables ...

     github_private_runner = {
       container_app_environment_id       = data.azurerm_container_app_environment.runner.id
       container_app_environment_location = "italynorth"
       key_vault = {
         name                = "my-keyvault"
         resource_group_name = "my-rg"
       }
       use_github_app = true
     }
   }
   ```

Note, you can use both modules in the same repository if needed.

:::info[Azure Permissions for Initial Setup]

The initial `terraform apply` for the Bootstrap module must be run locally by an
Azure account that has the `Role Based Access Control Administrator` and
`Contributor` roles assigned at the subscription level.

Within the PagoPA context, you can obtain the necessary RBAC role by opening a
Pull Request against the company Azure authorization repository, adding this
administrative roles to the product Engineering Leader. For example in Azure:

```terraform
  ...
  {
    name = "io-p-adgroup-eng-leader-team"
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

:::

### Obtaining GitHub App credentials {#obtaining-github-app-credentials}

The self-hosted runner modules authenticate with GitHub using a **GitHub App**.
A GitHub App provides fine-grained permissions, does not expire, and is not tied
to any individual user account.

You need to create a GitHub App and store three secrets in the Key Vault
referenced by the runner module:

| Key Vault secret name               | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `github-runner-app-id`              | The numeric ID of the GitHub App                          |
| `github-runner-app-installation-id` | The installation ID of the App on the target organization |
| `github-runner-app-key`             | The App private key in PEM format                         |

#### 1. Create a GitHub App

1. In PagoPA context, see
   [the documentation](https://pagopa.atlassian.net/wiki/search?text=Creazione%20GithubApp%20configurazione%20repo)
2. Generate and wonload a private key as exposed in the above link and keep it
   safe, you will need its contents shortly.

#### 2. Retrieve the App ID

The **App ID** is shown on the App settings page under **About** → **App ID**.

#### 3. Store the secrets in Key Vault

Store the three values as Key Vault secrets using the Azure CLI as break lines
are important:

```bash
az keyvault secret set \
  --vault-name "<your-keyvault-name>" \
  --name "github-runner-app-id" \
  --value "<app-id>"

az keyvault secret set \
  --vault-name "<your-keyvault-name>" \
  --name "github-runner-app-installation-id" \
  --value "<installation-id>"

az keyvault secret set \
  --vault-name "<your-keyvault-name>" \
  --name "github-runner-app-key" \
  --file "<path-to-private-key.pem>"
```

Once the secrets are in place, the runner module can be configured with
`use_github_app = true` and it will automatically read these values at runtime.
