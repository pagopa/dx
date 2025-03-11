---
sidebar_position: 1
sidebar_label: Configuring Azure Login for GitHub Actions
---

# Configuring Azure Login for GitHub Actions

There are several ways to log into Azure by a GitHub Action. The DX chosen
method doesn't require maintenance or secret management as it is a passwordless
approach. Once set up, it just works.

Only two components are needed to let GitHub Actions log into Azure:

1. An Azure Managed Identity resource
1. A federation between the Azure Managed Identity and the GitHub repository

The folder `infra/identity` contains the Terraform definition to create both the
Managed Identity and the federation with GitHub using a
[Terraform custom module](https://github.com/pagopa/dx/tree/main/infra/modules/azure_federated_identity_with_github)
. The module also provides a set of default roles in the current Azure
subscription, which are likely to be enough for new repositories (more on this
later...).

Once the Managed Identity is created, get the `client id` value and note it
apart.

:::note

The Managed Identity Client Id is available in the Azure Portal, navigating to
the Managed Identity resource:
![Azure Portal showing the client id](image_azmi.png)

:::

Your GitHub repository is now federated with the Managed Identity which GitHub
Actions will use to log into Azure:

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

> Rather than specifying the `azure/login` action directly, you'd likely find
> yourself more often passing them as workflow arguments to
> [DX Terraform Modules](https://github.com/pagopa/dx/tree/main/infra/modules).

:::

## GitHub environments

A GitHub pipeline could use GitHub environments to inherits settings, secrets,
variables, permissions and other stuff. As Azure subscriptions are grouped by
project (`PROD-IO`, `PROD-SELFCARE`, etc.) and environment (`DEV-SELFCARE`,
`UAT-SELFCARE`, etc.), GitHub environments are used to get the value of a given
secret depending on the current scope which comprises both.

Values for `tenant id`, `subscription id` and `managed identity client id` can
be stored as secrets tied to a specific GitHub environment. In particular:

- `tenant id`: the value is always the same and could be stored as repository
  secret
- `subscription id`: if the project has a single environment it could be stored
  as repository secret; otherwise use an environment secret
- `managed identity client id`: always as environment secret

:::tip

GitHub environments and secrets may be created via Terraform using the
[provided DX module](https://github.com/pagopa/dx/tree/main/infra/repository).

:::

### Managing multiple GitHub environments

A managed identity has a set of roles in a given subscription. Therefore,
multiple pipelines that require the same roles can use the same managed
identity, including the same GitHub environment.

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

Generally, the following convention is used to name the GitHub environments:

- `<env>-ci/cd`: dedicated to IaC (Terraform HCL) code (i.e. `prod-ci`)
- `app-<env>-ci/cd`: dedicated to applicatives (Azure Functions or App Service)
  deployments
- `opex-<env>-ci/cd`: dedicated to the Opex dashboard deployments

For any other need, add the desired environment sticking to this pattern.

:::

## Managing identity roles

The module mentioned earlier, which creates a Managed Identity federated with
GitHub, assigns a default set of roles to the Identity. However, it is highly
likely that these roles will need to be changed over time.

This can happen when, for example, a new resource is added to the configuration
that requires special roles. Or when the Terraform code needs to read a secret
from a new KeyVault or access blobs from a new Storage Account. It is impossible
to anticipate all possible cases, as things change over time.

Therefore, it is important to update the identity definition with the
appropriate roles whenever a new role is needed. There are numerous scenarios
where this could occur, but some common examples include:

- Modifying roles of system-assigned managed identities
- Accessing a new entity from the KeyVault (such as certificates, secrets, or
  keys)
- Adding VNet peerings
- Updating APIM configuration
- Reading from a Storage Account container, queue, or table

The general advice is to check the CI pipeline, as it may fail due to a missing
role. In such cases, identify the required role using the official documentation
and create a pull request (PR) with the updated definition.

:::warning

Setting new roles is quite easy and must be done separately for CI and CD
identities.

:::

:::tip

Granularity is set at subscription and resource group level. Check the module
documentation for details.

:::
