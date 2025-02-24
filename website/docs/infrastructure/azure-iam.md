# Azure IAM Roles and Permissions for Developer Teams

## Overview

Our IAM design focuses on balancing security and team autonomy while maintaining operational efficiency. Each domain team owns their cloud resources, managing access permissions as well.

We use three Entra ID security groups per team: Admins (domain experts), Developers (regular team members), and Externals (contractors). This segmentation allows for appropriate access levels based on role responsibilities and trust levels. Each team is responsible on how to split members among these groups by making a PR on [eng-azure-authorization](https://github.com/pagopa/eng-azure-authorization/tree/main/src/azure-subscriptions/subscriptions) repository.

## Permission Hierarchy

### Subscription-Level Access

#### Admin Group

- `Contributor` role on the subscription: can view and manage all resources
- Can assist in emergency situations and manage cross-team resources

#### Developer Group

- `Reader` role on the subscription: can view all resources but cannot modify them
- Can have an overview of the broader infrastructure context

#### External Group

- `Reader` role on the subscription: can view all resources but cannot modify them
- Can understand system architecture while maintaining security

### Resource Group-Level Access

#### Team-Specific Resource Groups

Resource groups owned and managed by a single team.

##### Admin Group

- `Owner` role: full control over all resources within the group
- Can manage IAM assignments within the group
- Can manage resource locks
- In Key Vaults using RBAC:
  - `Key Vault Data Access Administrator` role: can manage secrets, keys and certificates
  - `Key Vault Administrator` role: can manage resource properties

##### Developer Group

- `Contributor` role: can create and manage resources
- Cannot modify IAM assignments
- Cannot modify resource locks
- In Key Vaults using RBAC:
  - `Key Vault Secrets Officer` role: can manage secrets

##### External Group

- `Reader` (inherited) role: can view resources and configurations
- No modification privileges

#### Shared Resources-Level Access

Some resources are inherently shared across teams due to their nature or architectural decisions. These include also:

- Application Gateways
- API Management
- Public and Private DNS Zones
- Private Endpoints
- Other product-specific resources

For shared resources, teams must request role assignments through Pull Requests to the repository they are defined (generally `<product-name>-infra`). This process is useful to control access nad management of critical resources with big radius impact.

## Role-Based Access Matrix

The following roles are set up automatically by the Terraform module `azure_github_environment_bootstrap`. Its usage is strong advised for mono repositories.
The first view is cleaner and easier to read, recommended for developers.

<details>
  <summary>Simplified view</summary>

| | **Product Subscription** | **Product Private Endpoints** | **Product Private DNS Zone** | **Product NAT Gateway** | **Product APIM** | **Team Resource Groups** | **Opex Resource Group** |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Entra ID Adm** | Writer | Writer | Writer | Writer | Writer | Writer - Lock manager - IAM manager | (inherited Contributor) |
| **Entra ID Devs** | Reader | Writer | Reader | Reader | Reader | Writer - No access to Certificate and Keys | (inherited Reader) |
| **Entra ID Ext** | Reader | Writer | Reader | Reader | Reader | Reader | (inherited Reader) |
| **** |  |  |  |  |  |  |  |
| **ID Infra CI** | Reader | Reader | Reader | Reader | List secrets | Reader | Reader |
| **ID Infra CD** | Reader - IAM Manager | Writer | Writer | Writer | Writer | Writer - Manage roles - Manage resource locks | Reader - Manage roles |
| **ID App CD** | Reader | Writer | Writer | Writer | Writer | Writer | Reader |
| **ID Opex CI** | Reader | Reader | Reader | Reader | Reader | Reader | Reader |
| **ID Opex CD** | Reader | Reader | Reader | Reader | Reader | Reader | Writer |

</details>
<br>

This view is instead recommended for cloud operators.

<details>
  <summary>Detailed view</summary>

| | **Product Subscription** | **Product Private Endpoints** | **Product Private DNS Zone** | **Product NAT Gateway** | **Product APIM** | **Team Resource Groups** | **Opex Resource Group** |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Entra ID Adm** | Contributor | (inherited Contributor) | (inherited Contributor) | (inherited Contributor) | (inherited Contributor) | Owner - Key Vault Data Access Administrator - Key Vault Administrator | (inherited Contributor) |
| **Entra ID Devs** | Reader | (inherited Reader) | (inherited Reader) | (inherited Reader) | (inherited Reader) | Contributor - Key Vault Secrets Officer | (inherited Reader) |
| **Entra ID Ext** | Reader | (inherited Reader) | (inherited Reader) | (inherited Reader) | (inherited Reader) | Reader | (inherited Reader) |
| **** |  |  |  |  |  |  |  |
| **ID Infra CI** | Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | PagoPA API Management Service List Secrets | Key Vault Secrets User - Key Vault Certificate User - Key Vault Crypto User - Storage Blob Data Reader - Storage Queue Data Reader - Storage Table Data Reader | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) |
| **ID Infra CD** | Reader - Role Based Access Control Administrator | Network Contributor | Private DNS Zone Contributor | Network Contributor | API Management Service Contributor | Contributor - Key Vault Secrets Officer - Key Vault Certificates Officer - Key Vault Crypto Officer | (inherited Reader - Role Based Access Control Administrator) |
| **ID App CD** | Reader | (inherited Reader) | (inherited Reader) | (inherited Reader) | (inherited Reader) | (inherited Reader) | Contributor |
| **ID Opex CI** | Reader - Reader and Data Access | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) |
| **ID Opex CD** | Reader | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | (inherited Reader - Reader and Data Access) | Monitoring Contributor - PagoPA Opex Dashboards Contributor |

</details>

### Roles explanation

`Reader`: Resource control plane read-only access

`Reader and Data Access`: Resource data plane read access. Allow to write on Storage Account using keys as authentication system

`PagoPA IaC Reader`: List keys and credentials for IaC access

`DocumentDB Account Contributor`: CosmosDB control plane access

`Key Vault Data Access Administrator`: Manage access to Azure Key Vault

`Key Vault Administrator`: Include data plane operations on a key vault and all objects in it, including certificates, keys, and secrets

`Key Vault Secrets Officer`: Perform any action on the secrets of a key vault, except manage permissions.

`Role Based Access Control Administrator`: Manage access to Azure resources by assigning roles using Azure RBAC

`User Access Administrator`: Lets you manage user access to Azure resources, including locks

`Network Contributor`: Lets you manage networks, but not access to them

`Private DNS Zone Contributor`: Lets you manage private DNS zone resources, but not the virtual networks they are linked to.

`API Management Service Contributor`: Can manage service and the APIs

`Storage Blob Data Contributor`: Read, write, and delete Azure Storage containers and blobs

`Storage Queue Data Contributor`: Read, write, and delete Azure Storage queues and queue messages

`Storage Table Data Contributor`: Allows for read, write and delete access to Azure Storage tables and entities

## Code Examples (How-To)

### How to label a resource group as team-owned

Create the resource group in `Repository` Terraform configuration of your mono repository and pass its resource id to the `azure_github_environment_bootstrap` moduel via the `TBD` variable. All roles will be automatically applied.

<details>
  <summary>Example</summary>

  ```hcl
    resource "azurerm_resource_group" "domain_itn_01" {
      name     = "name"
      location = "location"
      tags     = var.tags
    }

    module "repo" {
      source  = "pagopa/dx-azure-github-environment-bootstrap/azurerm"
      version = "~>1"

      TBD = [
        azurerm_resource_group.domain_itn_01.id
      ]
  ```

</details>

### Azure APIM

#### List secrets

#### Entity manager

### Azure Cosmos DB

### Azure Event Hub

#### List secrets

#### Entity manager

### Azure Storage Account

#### Blob

#### Queue

#### Table

## Best Practices

### Role Usage Guidelines

- Follow least-privilege principle
- Add a brief description in the proper field of the role assignment object when available
- Use admin privileges only for critical operations

### Security Considerations

- Avoid connection strings; use managed identities where possible
- Remove unused role assignments
