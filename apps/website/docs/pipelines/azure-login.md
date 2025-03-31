---
sidebar_position: 1
sidebar_label: Configuring Azure Login for GitHub Actions
---

# Configuring Azure Login for GitHub Actions

There are several ways to log into Azure using a GitHub Action. The DX-preferred
method is passwordless, requiring no maintenance or secret management. Once set
up, it works seamlessly.

:::tip

The modules `azure_federated_identity_with_github` and
`azure_github_environment_bootstrap` already implement the steps described in
this article. While the latter also creates the required GitHub Environments and
secrets, both modules provide a default set of roles in the current Azure
subscription, which is likely sufficient for new repositories (more on this
later).

:::

To enable GitHub Actions to log into Azure, you need only two components:

1. A User-Assigned Azure Managed Identity resource
2. A federation between the Azure Managed Identity and the GitHub repository

Create a User-Assigned Managed Identity using the following command:

```bash
az identity create --name <myIdentity> \
  --resource-group <myRg> \
  --location <myLocation> \
  --tags <myTags>
```

After creating the Managed Identity, retrieve its `client id` and save it for
later use.

:::note

You can obtain the Managed Identity Client ID in the Azure Portal by navigating
to the Managed Identity resource:  
![Azure Portal showing the client id](image_azmi.png)

Alternatively, you can find it using the Azure CLI:

```bash
az identity show --name <myIdentity> \
  --resource-group <myRg>
```

:::

To federate the identity with GitHub, navigate to the `Federated Credentials`
blade and create a new credential. Select the option
`Configure a GitHub issued token to impersonate this application and deploy to Azure`,
and fill in the required fields. Alternatively, use the Azure CLI:

```bash
az identity federated-credential create --identity-name <federationName> \
  --name <myName> \
  --resource-group <myRg> \
  --audiences "api://AzureADTokenExchange" \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:{Organization}/{Repository}:{Entity}"
```

Here, `Entity` can be a GitHub `Environment`, `Branch`, `Pull Request`, or
`Tag`.

Your GitHub repository is now federated with the Managed Identity, allowing
GitHub Actions to log into Azure for the specified `Entity`:

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ env.ARM_CLIENT_ID }}
    tenant-id: ${{ env.ARM_TENANT_ID }}
    subscription-id: ${{ env.ARM_SUBSCRIPTION_ID }}
```

Despite the three mentioned values are not secrets, they should not be harcoded
in the pipeline but shall be stored as repository or GitHub _environment_
secrets. This as they are likely to be used in multiple workflows and could be
changed over time.

:::important

> Instead of specifying the `azure/login` action directly, you will often pass
> these values as workflow arguments to
> [DX Terraform Modules](https://github.com/pagopa/dx/tree/main/infra/modules).

:::

## GitHub Environments

A GitHub pipeline could use GitHub environments to inherits settings, secrets,
variables, permissions and other stuff. As Azure subscriptions are grouped by
project (`PROD-IO`, `PROD-SELFCARE`, etc.) and environment (`DEV-SELFCARE`,
`UAT-SELFCARE`, etc.), GitHub environments are used to get the value of a given
secret depending on the current scope which comprises both.

The following values can be stored as secrets tied to specific GitHub
environments:

- `tenant id`: This value is constant and can be stored as a repository secret.
- `subscription id`: If the project has a single environment, store it as a
  repository secret; otherwise, use an environment secret.
- `managed identity client id`: Always store this as an environment secret.

:::tip

GitHub environments and secrets can be created via Terraform using the
[provided DX module](https://github.com/pagopa/dx/tree/main/infra/repository).

:::

### Managing Multiple GitHub Environments

A Managed Identity has a set of roles within a given subscription. Multiple
pipelines requiring the same roles can share the same Managed Identity and
GitHub environment.

Let's consider a scenario where a repository has two Azure Functions Apps, each
with its own application code and Terraform code. The Terraform deployments
require high privileges to create and update networking resources, identities,
key vault secrets, and more. On the other hand, the roles required for the
Function App deployments are limited to write access for the Function App
resource control plane. These deployments do not need access to other resources
such as networking, storage, or secrets. However, both Function Apps require the
same roles as the action performed is identical.

In this case, the two Function App pipelines can share the same Managed Identity
and the related GitHub environment. However, the Terraform code should point to
a dedicated GitHub environment.

:::tip

The following naming convention is generally used for GitHub environments:

- `infra-<env>-ci/cd`: For Infrastructure as Code (Terraform HCL) (e.g.,
  `infra-prod-ci`)
- `app-<env>-ci/cd`: For application deployments (e.g., Azure Functions or App
  Services)
- `opex-<env>-ci/cd`: For Opex dashboard deployments

For other needs, create environments following this pattern.

:::

## Managing Identity Roles

The module that creates a Managed Identity federated with GitHub assigns a
default set of roles. However, these roles may need to be updated over time.

This can happen when, for example, a new resource is added to the configuration
that requires special roles. Or when the Terraform code needs to read a secret
from a new KeyVault or access blobs from a new Storage Account. It is impossible
to anticipate all possible cases, as things change over time.

Therefore, it is important to update the identity definition with the
appropriate roles whenever a new role is needed. There are numerous scenarios
where this could occur, but some common examples include:

- Modify roles for system-assigned managed identities
- Access new entities in a KeyVault (e.g., certificates, secrets, or keys)
- Add VNet peerings
- Update APIM configurations
- Read from a Storage Account container, queue, or table

The general advice is to check the CI pipeline, as it may fail due to a missing
role. In such cases, identify the required role using the official documentation
and create a pull request (PR) with the updated definition.

:::warning

Setting new roles is straightforward but must be done separately for CI and CD
identities.

:::

:::tip

Roles are assigned at the subscription and resource group levels. Refer to the
module documentation for details.

:::
