# 🤖 Copilot CLI Session

> **Session ID:** `40c8794c-5f69-45ae-bd72-ecb62c26553e`
> **Started:** 02/03/2026, 13:14:40
> **Duration:** 5m 11s
> **Exported:** 02/03/2026, 13:19:52

<sub>⏱️ 4s</sub>

### 👤 User

Usa esclusivamente la skill "terraform-dx-best-practices-subagent".


## Task

Genera un root module Terraform completo per un nuovo progetto Azure con:
- **Function App** (runtime Node.js 20)
- **Storage Account** (per la Function App e artefatti)
- **Cosmos DB** (API NoSQL, serverless)

## Requisiti obbligatori

1. **Naming**: usa provider::dx::resource_name() del provider pagopa-dx/azure per tutti i nomi delle risorse.
2. **Tag**: includi tutti i tag obbligatori DX: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam.
3. **Moduli**: usa i moduli pagopa-dx/* dal Terraform Registry (con versione pinned ~\> major.minor). Usa risorse raw azurerm_* solo se non esiste un modulo DX per quella risorsa.
4. **Segreti**: nessun valore hardcoded. Usa Key Vault references (@Microsoft.KeyVault(...) o azurerm_key_vault_secret).
5. **Struttura file**: separa il codice in main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf.

## Output

Scrivi i file Terraform direttamente nella cartella: /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output

Crea ogni file separatamente. Non scrivere blocchi di codice in chat. Al termine includi un breve README.md nella stessa cartella che spieghi come la skill ha recuperato la documentazione e le scelte fatte.

---

<sub>⏱️ 16s</sub>

### ✅ `skill`

**terraform-dx-best-practices-subagent**

<details>
<summary>Arguments</summary>

```json
{
  "skill": "terraform-dx-best-practices-subagent"
}
```

</details>

```
Skill "terraform-dx-best-practices-subagent" loaded successfully. Follow the instructions in the skill context.
```


---

<sub>⏱️ 35s</sub>

### 📦 task (Completed)

### 💬 Copilot

I'll research PagoPA DX Terraform best practices comprehensively. Let me gather information from multiple sources in parallel.

### ✅ `web_fetch`

**https://dx.pagopa.it/docs/terraform/**

<details>
<summary>Arguments</summary>

```json
{
  "url": "https://dx.pagopa.it/docs/terraform/",
  "max_length": 20000
}
```

</details>

<details>
<summary>40 lines</summary>

```
Contents of https://dx.pagopa.it/docs/terraform/:
This section offers comprehensive guidance on infrastructure-related topics, common problem resolutions, patterns, and best practices for building scalable applications on Azure.

## Infrastructure for Application Developers[​](#infrastructure-for-application-developers "Direct link to Infrastructure for Application Developers")

As a software engineer, you'll need to deploy infrastructure for your applications. Start here:

1.  **[Learn about our Terraform modules](/docs/terraform/using-terraform-registry-modules)** - Use our production-ready modules
2.  **[Deploy Azure resources](/docs/azure/)** - Deploy secure, scalable infrastructure for your applications
3.  **[Automate deployments](/docs/terraform/infra-apply)** - Set up CI/CD for infrastructure

## Available Tools[​](#available-tools "Direct link to Available Tools")

### 🏗️ Terraform Modules[​](#️-terraform-modules "Direct link to 🏗️ Terraform Modules")

Production-ready modules available on the [Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx):

*   **[Azure Core Infrastructure](https://registry.terraform.io/modules/pagopa-dx/azure-core-infra)** - Foundational networking, security, and monitoring
*   **[Container App Environment](https://registry.terraform.io/modules/pagopa-dx/azure-container-app-environment)** - Scalable containerized applications
*   **[Role Assignments](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments)** - Secure identity and access management

[**Browse all modules →**](https://registry.terraform.io/namespaces/pagopa-dx)

### 🔧 DX Provider[​](#-dx-provider "Direct link to 🔧 DX Provider")

Custom Terraform provider for Azure resources:

*   Simplified configuration for common patterns
*   Built-in security best practices
*   Integration with DX conventions

[**Learn about the DX provider →**](/docs/contributing/contributing-to-dx-provider)

### 📋 Best Practices[​](#-best-practices "Direct link to 📋 Best Practices")

*   **[IaC Folder structure](/docs/terraform/infra-folder-structure)** - Organize Infrastructure as Code
*   **[Code style](/docs/terraform/code-style)** - File organization, variables, outputs, and formatting conventions
*   **[Required tags](/docs/terraform/required-tags)** - Mandatory tags for all Azure resources
*   **[Pre-commit hooks](/docs/terraform/pre-commit-terraform)** - Validate and format Terraform code
*   **[Azure naming conventions](/docs/azure/azure-naming-convention)** - Consistent resource naming
*   **[Secrets management](/docs/azure/application-deployment/appservice-hidden-appsettings)** - Use Key Vault references in AppSettings

## Azure Resources Guide[​](#azure-resources-guide "Direct link to Azure Resources Guide")

### Most Common Use Cases[​](#most-common-use-cases "Direct link to Most Common Use Cases")

*   **[Setting up static web apps](/docs/azure/static-websites/build-deploy-static-web-app)** - Deploy static sites with CI/CD
*   **[IAM and security](/docs/azure/iam/azure-iam)** - Manage permissions and access control
*   **[API Management](/docs/azure/apim/)** - Configure and secure APIs
*   **[Monitoring and tracing](/docs/azure/monitoring/azure-tracing)** - Observability and debugging

[**View all Azure guides →**](/docs/azure/)

## Contributing[​](#contributing "Direct link to Contributing")

Help improve DX infrastructure tools:

*   **[Contributing to Terraform modules](/docs/contributing/contributing-to-dx-terraform-modules)** - Add new modules or improve existing ones
*   **[Module documentation](/docs/contributing/documenting-dx-terraform-modules)** - Keep docs up to date
*   **[Testing and validation](/docs/terraform/pre-commit-terraform)** - Ensure quality and consistency

**Infrastructure as Code Best Practices**
```

</details>


### ✅ `web_fetch`

**https://dx.pagopa.it/docs/terraform/code-style**

<details>
<summary>Arguments</summary>

```json
{
  "url": "https://dx.pagopa.it/docs/terraform/code-style",
  "max_length": 20000
}
```

</details>

<details>
<summary>100 lines</summary>

````
Contents of https://dx.pagopa.it/docs/terraform/code-style:
This guide describes the DX code style conventions for Terraform configurations. Following these conventions ensures consistency and maintainability across all infrastructure code.

Before you start

Ensure [pre-commit hooks](/docs/terraform/pre-commit-terraform) are set up to automate validation and formatting of Terraform sources.

## File Organization[​](#file-organization "Direct link to File Organization")

Organize Terraform code into dedicated files based on their purpose:

File

Content

`locals.tf`

Local values, naming configs, computed values

`providers.tf`

Terraform block, required providers, backend, provider configs

`variables.tf`

Input variables with descriptions and validations

`outputs.tf`

Output values with descriptions

`main.tf` or `<resource>.tf`

Resources and modules (e.g., `azure.tf`, `function.tf`)

`data.tf`

Data sources

About project structure

This guide covers code style conventions for individual terraform configurations. For the overall infrastructure project structure, see [Infrastructure Folder Structure](/docs/terraform/infra-folder-structure).

## Variable Definitions[​](#variable-definitions "Direct link to Variable Definitions")

Always include descriptions and validations

Every variable should have a `description` and, where applicable, a `validation` block to catch errors early.

variables.tf

```
variable "environment" {  type = object({    prefix          = string    env_short       = string    location        = string    domain          = optional(string)  # Use optional() for non-required fields    app_name        = string    instance_number = string  })  description = "Values used to generate resource names and location short names."}variable "use_case" {  type        = string  description = "Function App use case. Allowed values: 'default', 'high_load'."  default     = "default"  validation {    condition     = contains(["default", "high_load"], var.use_case)    error_message = "Allowed values for \"use_case\" are \"default\", \"high_load\"."  }}
```

## Output Definitions[​](#output-definitions "Direct link to Output Definitions")

Group related outputs in objects for better organization and discoverability. Avoid nesting the resource name in the output structure to prevent redundant keys when consuming the module (e.g., avoid `module.x.function_app.function_app.id`):

outputs.tf

```
output "postgres" {  description = "Details of the PostgreSQL Flexible Server, including its name, ID, and resource group name."  value = {    name                = azurerm_postgresql_flexible_server.this.name    id                  = azurerm_postgresql_flexible_server.this.id    resource_group_name = azurerm_postgresql_flexible_server.this.resource_group_name  }}output "postgres_replica" {  description = "Details of the PostgreSQL Flexible Server Replica, including its name and ID."  value = local.replica.create == true ? {    name = azurerm_postgresql_flexible_server.replica[0].name    id   = azurerm_postgresql_flexible_server.replica[0].id  } : {}}
```

## Locals Best Practices[​](#locals-best-practices "Direct link to Locals Best Practices")

### Use a `naming_config` Local[​](#use-a-naming_config-local "Direct link to use-a-naming_config-local")

Create a `naming_config` local to standardize resource naming with the [DX provider](/docs/azure/using-azure-registry-provider):

locals.tf

```
locals {  naming_config = {    prefix          = var.environment.prefix    environment     = var.environment.env_short    location        = var.environment.location    domain          = var.environment.domain    name            = var.environment.app_name    instance_number = tonumber(var.environment.instance_number)  }  # Use naming_config with provider function  function_app_name = provider::dx::resource_name(merge(    local.naming_config,    { resource_type = "function_app" }  ))}
```

### Automatic Subnet CIDR Generation[​](#automatic-subnet-cidr-generation "Direct link to Automatic Subnet CIDR Generation")

Use the DX provider `dx_available_subnet_cidr` resource for every new subnet to automatically allocate a non-overlapping CIDR block inside the target Virtual Network.

See the full usage and examples in the DX provider docs: [dx\_available\_subnet\_cidr resource](https://dx.pagopa.it/docs/azure/using-azure-registry-provider#dx_available_subnet_cidr-resource)

### Define Use Cases with Maps[​](#define-use-cases-with-maps "Direct link to Define Use Cases with Maps")

Many DX Registry modules already have built-in `use_case` configurations for common scenarios. For custom resources or when modules don't provide the needed use cases, define your own using maps:

locals.tf

```
locals {  use_cases = {    default = {      sku            = "P1v3"      zone_balancing = true    }    high_load = {      sku            = "P2mv3"      zone_balancing = true    }  }  # Select features based on variable  use_case_features = local.use_cases[var.use_case]}
```

## count vs for\_each[​](#count-vs-for_each "Direct link to count vs for_each")

Prefer for\_each over count

Using `count` with lists can cause unexpected resource recreation when items are added or removed.

✅ Good: for\_each with maps/sets

```
resource "azurerm_resource_group" "this" {  for_each = var.environments  # map or set  name     = "rg-${each.key}"  location = each.value.location}
```

⚠️ OK: count for enable/disable patterns

```
resource "azurerm_subnet" "optional" {  count = var.create_subnet ? 1 : 0  name = "my-subnet"  # ...}
```

❌ Avoid: count with lists

```
# Index changes cause recreation!resource "azurerm_subnet" "bad" {  count = length(var.subnet_names)  name  = var.subnet_names[count.index]  # Risky!}
```

### Why Prefer for\_each?[​](#why-prefer-for_each "Direct link to Why Prefer for_each?")

Aspect

`for_each`

`count`

Identifiers

Stable keys (`resource["prod"]`)

Index-based (`resource[0]`)

Reordering

No recreation

May cause recreation

Adding/removing

Only affects target resource

May shift all indexes

Readability

`this["prod"]` is self-documenting

`this[0]` requires context

## Formatting Rules[​](#formatting-rules "Direct link to Formatting Rules")

*   ✅ Use `try()` for optional attribute access: `try(resource.attr[0].value, null)`

* * *

## Standard File Templates[​](#standard-file-templates "Direct link to Standard File Templates")

### Standard locals.tf[​](#standard-localstf "Direct link to Standard locals.tf")

infra/resources/prod/locals.tf

```
locals {  environment = {    prefix          = "<product>"      # e.g., "io", "cgn"    env_short       = "p"              # p, d, u    location        = "italynorth"    domain          = "<domain>"       # optional    app_name        = "<app>"    instance_number = "01"  }  tags = {    CostCenter     = "TS000 - Tecnologia e Servizi"    CreatedBy      = "Terraform"    Environment    = "Prod"            # Based on folder: Prod, Dev, Uat    BusinessUnit   = "<business-unit>"    Source         = "https://github.com/pagopa/<repo>/blob/main/infra/resources/prod"    ManagementTeam = "<team>"  }}
```

### Standard providers.tf[​](#standard-providerstf "Direct link to Standard providers.tf")

infra/resources/prod/providers.tf

```
terraform {  required_providers {    azurerm = {      source  = "hashicorp/azurerm"      version = "~> 4.0"    }    dx = {      source  = "pagopa-dx/azure"      # always check for latest available release      version = "~> 0.0"    }  }  backend "azurerm" {    resource_group_name  = "<tfstate-rg>"    storage_account_name = "<tfstate-storage>"    container_name       = "terraform-state"    key                  = "<project>.<layer>.<env>.tfstate"    use_azuread_auth     = true  }}provider "azurerm" {  features {}  storage_use_azuread = true}provider "dx" {}
```

State key naming convention

Use the format `<project>.<layer>.<env>.tfstate` for the backend key:

*   `io.resources.prod.tfstate`
*   `cgn.bootstrapper.dev.tfstate`
````

</details>


### ✅ `web_fetch`

**https://dx.pagopa.it/docs/terraform/required-tags**

<details>
<summary>Arguments</summary>

```json
{
  "url": "https://dx.pagopa.it/docs/terraform/required-tags",
  "max_length": 20000
}
```

</details>

<details>
<summary>87 lines</summary>

````
Contents of https://dx.pagopa.it/docs/terraform/required-tags:
All Azure resources created with Terraform must include a standard set of tags. These tags are essential for cost tracking, ownership identification, and resource management.

Tag

Description

Example Values

`CostCenter`

Budget tracking identifier

`"TS000 - Tecnologia e Servizi"` for IO

`CreatedBy`

How the resource was created

Always `"Terraform"`

`Environment`

Deployment environment

`"Prod"`, `"Dev"`, `"Uat"`

`BusinessUnit`

Product or business unit

`"App IO"`, `"CGN"`, `"Carta della Cultura"`, `"IT Wallet"`, `"DevEx"`

`Source`

Link to the Terraform source code

`"https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"`

`ManagementTeam`

Team responsible for the resource management

`"IO Platform"`, `"IO Wallet"`, `"IO Comunicazione"`, `"Developer Experience"`, etc.

## Implementation[​](#implementation "Direct link to Implementation")

Define tags in `locals.tf` and apply them to all resources:

locals.tf

```
locals {  tags = {    CostCenter     = "TS000 - Tecnologia e Servizi"    CreatedBy      = "Terraform"    Environment    = "Prod"    BusinessUnit   = "App IO"    Source         = "https://github.com/pagopa/io-infra/blob/main/infra/resources/prod"    ManagementTeam = "IO Platform"  }}
```

main.tf

```
resource "azurerm_resource_group" "example" {  name     = "example-rg"  location = "italynorth"  tags = local.tags}
```

Consistent Tagging

Always pass `local.tags` to resources and modules. Never hardcode tags directly in resources.

## Business Units[​](#business-units "Direct link to Business Units")

Common business unit values used at PagoPA:

BusinessUnit

Description

`App IO`

IO mobile application

`CGN`

Carta Giovani Nazionale

`Carta della Cultura`

Cultural card initiative

`IT Wallet`

Digital wallet initiative

`DevEx`

Developer Experience team

## Management Teams[​](#management-teams "Direct link to Management Teams")

Common management team values for the IO product:

ManagementTeam

Area

`IO Platform`

Platform infrastructure

`IO Wallet`

Wallet features

`IO Comunicazione`

Communication features

`IO Enti & Servizi`

Services integration

`IO Autenticazione`

Authentication

`IO Bonus & Pagamenti`

Bonus and payments

`IO Firma`

Digital signature

`Developer Experience`

DevEx team

## Environment Values[​](#environment-values "Direct link to Environment Values")

The `Environment` tag should match the deployment folder:

Folder

Environment Tag

`dev/`

`"Dev"`

`uat/`

`"Uat"`

`prod/`

`"Prod"`

## Source Tag Format[​](#source-tag-format "Direct link to Source Tag Format")

The `Source` tag must point to the exact location of the Terraform code in the GitHub repository:

```
https://github.com/pagopa/<repository>/blob/main/infra/resources/<environment>
```

Examples

*   `https://github.com/pagopa/io-infra/blob/main/infra/resources/prod`
*   `https://github.com/pagopa/cgn-onboarding-portal/blob/main/infra/resources/dev`
````

</details>


### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure function app"
}
```

</details>

<details>
<summary>23 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure function app

 Each result includes:
- module_id: The module ID (format: namespace/name/provider-name/module-version)
- Name: The name of the module
- Description: A short description of the module
- Downloads: The total number of times the module has been downloaded
- Verified: Verification status of the module
- Published: The date and time when the module was published


---

- module_id: pagopa-dx/azure-function-app/azurerm/4.3.0
- Name: azure-function-app
- Description: Deploys an Azure Function App with storage, networking and RBAC configuration
- Downloads: 19443
- Verified: false
- Published: 2026-02-17 12:02:10.911922 +0000 UTC
---

- module_id: pagopa-dx/azure-function-app-exposed/azurerm/2.0.1
- Name: azure-function-app-exposed
- Description: Creates an Azure Function App configured for external access
- Downloads: 683
- Verified: false
- Published: 2026-01-23 17:09:54.01741 +0000 UTC
---
```

</details>


### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure storage account"
}
```

</details>

<details>
<summary>16 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure storage account

 Each result includes:
- module_id: The module ID (format: namespace/name/provider-name/module-version)
- Name: The name of the module
- Description: A short description of the module
- Downloads: The total number of times the module has been downloaded
- Verified: Verification status of the module
- Published: The date and time when the module was published


---

- module_id: pagopa-dx/azure-storage-account/azurerm/2.1.4
- Name: azure-storage-account
- Description: Provisions an Azure Storage Account with networking, monitoring, and security configurations
- Downloads: 16374
- Verified: false
- Published: 2026-02-12 08:29:13.545436 +0000 UTC
---
```

</details>


### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure cosmos db"
}
```

</details>

<details>
<summary>16 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure cosmos db

 Each result includes:
- module_id: The module ID (format: namespace/name/provider-name/module-version)
- Name: The name of the module
- Description: A short description of the module
- Downloads: The total number of times the module has been downloaded
- Verified: Verification status of the module
- Published: The date and time when the module was published


---

- module_id: pagopa-dx/azure-cosmos-account/azurerm/0.4.0
- Name: azure-cosmos-account
- Description: Provisions an Azure Cosmos DB account with monitoring and network settings
- Downloads: 4773
- Verified: false
- Published: 2026-01-23 17:09:47.432319 +0000 UTC
---
```

</details>


### ✅ `terraform-search_providers`

<details>
<summary>Arguments</summary>

```json
{
  "provider_namespace": "pagopa-dx",
  "provider_name": "azure",
  "service_slug": "resource_name",
  "provider_document_type": "functions"
}
```

</details>

<details>
<summary>14 lines</summary>

```
# azure provider docs

Available Documentation (top matches) for functions in Terraform provider pagopa-dx/azure version: 0.8.3

Each result includes:
- providerDocID: tfprovider-compatible identifier
- Title: Service or resource name
- Category: Type of document
- Description: Brief summary of the document
For best results, select libraries based on the service_slug match and category of information requested.

---

- providerDocID: 11349628
- Title: resource_name
- Category: functions
- Description: Return Azure dx resources naming convention
---
```

</details>


### 💬 Copilot

Now let me get detailed information about the modules and provider functions found:

### ✅ `terraform-get_module_details`

<details>
<summary>Arguments</summary>

```json
{
  "module_id": "pagopa-dx/azure-function-app/azurerm/4.3.0"
}
```

</details>

<details>
<summary>138 lines</summary>

```
# registry://modules/pagopa-dx/azure-function-app

**Description:** Deploys an Azure Function App with storage, networking and RBAC configuration

**Module Version:** 4.3.0

**Namespace:** pagopa-dx

**Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-function-app

### Inputs

| Name | Type | Description | Default | Required |
|---|---|---|---|---|
| application_insights_sampling_percentage | number | The sampling percentage for Application Insights telemetry. Default is 5. | `5` | false |
| slot_app_settings | map(string) | A map of application settings specific to the staging slot of the Function App. | `{}` | false |
| subnet_cidr | string | The CIDR block for the subnet used by the Function App for outbound connectivity. Mandatory if 'subnet_id' is not set. | `null` | false |
| private_dns_zone_resource_group_name | string | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group. | `null` | false |
| private_dns_zone_ids | object({
    blob          = optional(string)
    file          = optional(string)
    queue         = optional(string)
    table         = optional(string)
    azurewebsites = optional(string)
  }) |   "Override IDs for private DNS zones. If not provided, zones will be looked up in \"private_dns_zone_resource_group_name\" (if provided) or Virtual Network resource group. Use this to reference DNS zones in different subscriptions."
 | `null` | false |
| subnet_service_endpoints | object({
    cosmos  = optional(bool, false)
    storage = optional(bool, false)
    web     = optional(bool, false)
  }) | Enable service endpoints for the subnet used by the Function App. Set this only if dependencies do not use private endpoints. | `null` | false |
| application_insights_key | string | The instrumentation key for Application Insights to enable monitoring and diagnostics. | `null` | false |
| health_check_path | string | The endpoint path where the health probe is exposed for the Function App. | `` | true |
| node_version | number | The version of Node.js to use for the Function App runtime. | `20` | false |
| subnet_pep_id | string | The ID of the subnet designated for private endpoints. | `` | true |
| action_group_ids | set(string) | The ID of the Action Groups to invoke when an alert is triggered for the Function App. | `[]` | false |
| has_durable_functions | bool | Set to true if the Function App hosts Durable Functions. | `false` | false |
| tls_version | number | Minimum TLS version for the App Service. | `1.2` | false |
| entra_id_authentication | object({
    audience_client_id         = string
    allowed_callers_client_ids = list(string)
    tenant_id                  = string
  }) | Enables Entra ID (Azure AD) authentication on the Function App, allowing callers (e.g. APIM) to authenticate via their Managed Identity instead of using function keys. When set, callers must present a valid JWT; unauthenticated requests receive HTTP 401. See README for prerequisites and usage examples. | `null` | false |
| diagnostic_settings | object({
    enabled                                   = bool
    log_analytics_workspace_id                = optional(string)
    diagnostic_setting_destination_storage_id = optional(string)
  }) | Define if diagnostic settings should be enabled.
If enabled, specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and
optionally the ID of the Storage Account where logs should be sent.
 | `{
  "diagnostic_setting_destination_storage_id": null,
  "enabled": false,
  "log_analytics_workspace_id": null
}` | false |
| tags | map(any) | A map of tags to assign to the resources. | `` | true |
| app_service_plan_id | string | The ID of the App Service Plan where the Function App will be hosted. Leave null to create a new plan. | `null` | false |
| app_settings | map(string) | A map of application settings for the Function App. | `` | true |
| virtual_network | object({
    name                = string
    resource_group_name = string
  }) | Details of the virtual network where the subnet for the Function App will be created. | `` | true |
| environment | object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  }) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | `` | true |
| resource_group_name | string | The name of the resource group where resources will be deployed. | `` | true |
| subnet_id | string | The ID of the subnet where the Function App will be hosted. Leave null to create a new subnet. | `null` | false |
| use_case | string | Function App use case. Allowed values: 'default', 'high_load'. | `"default"` | false |
| size | string | App Service Plan size. Allowed values: 'P0v3', 'P1v3', 'P2mv3', 'P3mv3'. If not set, it will be determined by the use_case. | `null` | false |
| stack | string | The runtime stack for the Function App. Allowed values are 'node' and 'java'. | `"node"` | false |
| java_version | string | The version of Java to use for the Function App runtime. | `17` | false |
| sticky_app_setting_names | list(string) | A list of application setting names that should remain constant and not be swapped between slots. | `[]` | false |
| application_insights_connection_string | string | The connection string for Application Insights to enable monitoring and diagnostics. | `null` | false |

### Outputs

| Name | Description |
|---|---|
| subnet | Details of the subnet used by the Function App, including its ID and name. |
| storage_account | Details of the primary storage account used by the Function App, including its ID and name. |
| storage_account_durable | Details of the storage account used for durable functions, including its ID and name. Returns null if not configured. |
| function_app | Details of the Function App, including its resource group, service plan, and app-specific information such as ID, name, principal ID, and default hostname. Also includes details of the app slot if configured. |
| diagnostic_settings | Details of the diagnostic settings configured for the Function App. |
| entra_id_authentication | Entra application client ID used when Entra ID authentication (via caller Managed Identity) is configured. Useful for downstream APIM policy configuration (e.g. <authentication-managed-identity resource="client_id"/>). |

### Provider Dependencies

| Name | Namespace | Source | Version |
|---|---|---|---|
| azurerm | hashicorp | hashicorp/azurerm | >= 4.8.0, < 5.0 |
| dx | pagopa-dx | pagopa-dx/azure | >= 0.6.0, < 1.0.0 |

### Examples

#### complete

**Readme:**

# complete

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_function_app"></a> [azure\_function\_app](#module\_azure\_function\_app) | pagopa-dx/azure-function-app/azurerm | ~> 4.1 |
| <a name="module_azure_function_app_with_entra_auth"></a> [azure\_function\_app\_with\_entra\_auth](#module\_azure\_function\_app\_with\_entra\_auth) | pagopa-dx/azure-function-app/azurerm | ~> 4.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azuread_application.example](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application) | data source |
| [azuread_service_principal.example_caller](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/service_principal) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->


#### with_storage_account_queue

**Readme:**

# with_storage_account_queue

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_function_app"></a> [azure\_function\_app](#module\_azure\_function\_app) | pagopa-dx/azure-function-app/azurerm | ~> 4.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_storage_account.external](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
```

</details>


### ✅ `terraform-get_module_details`

<details>
<summary>Arguments</summary>

```json
{
  "module_id": "pagopa-dx/azure-storage-account/azurerm/2.1.4"
}
```

</details>

<details>
<summary>192 lines</summary>

```
# registry://modules/pagopa-dx/azure-storage-account

**Description:** Provisions an Azure Storage Account with networking, monitoring, and security configurations

**Module Version:** 2.1.4

**Namespace:** pagopa-dx

**Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-storage-account

### Inputs

| Name | Type | Description | Default | Required |
|---|---|---|---|---|
| private_dns_zone_resource_group_name | string | Resource group for the private DNS zone. Defaults to the virtual network's resource group. | `null` | false |
| static_website | object({
    enabled            = optional(bool, false)
    index_document     = optional(string, null)
    error_404_document = optional(string, null)
  }) | Configures static website hosting with index and error documents. | `{
  "enabled": false,
  "error_404_document": null,
  "index_document": null
}` | false |
| environment | object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  }) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | `` | true |
| resource_group_name | string | The name of the resource group where the storage account and related resources will be deployed. | `` | true |
| use_case | string | Storage account use case. Allowed values: 'default', 'audit', 'delegated_access', 'development', 'archive'. | `"default"` | false |
| customer_managed_key | object({
    enabled                   = optional(bool, false)
    type                      = optional(string, null)
    key_name                  = optional(string, null)
    user_assigned_identity_id = optional(string, null)
    key_vault_id              = optional(string, null)
  }) | Configures customer-managed keys (CMK) for encryption. Supports only 'kv' (Key Vault). | `{
  "enabled": false
}` | false |
| force_public_network_access_enabled | bool | Allows public network access. Defaults to 'false'. | `false` | false |
| access_tier | string | Access tier for the storage account. Options: 'Hot', 'Cool', 'Cold', 'Premium'. Defaults to 'Hot'. | `"Hot"` | false |
| subnet_pep_id | string | The ID of the subnet used for private endpoints. Required only if `force_public_network_access_enabled` is set to false. | `null` | false |
| subservices_enabled | object({
    blob  = optional(bool, true)
    file  = optional(bool, false)
    queue = optional(bool, false)
    table = optional(bool, false)
  }) | Enables subservices (blob, file, queue, table). Creates Private Endpoints for enabled services. Defaults to 'blob' only. Used only if force_public_network_access_enabled is false. | `{}` | false |
| custom_domain | object({
    name          = optional(string, null)
    use_subdomain = optional(bool, false)
  }) | Custom domain configuration for the storage account. | `{
  "name": null,
  "use_subdomain": false
}` | false |
| secondary_location | string | Secondary location for geo-redundant storage accounts. Used if `use_case` need a replication_type like GRS or GZRS. | `null` | false |
| containers | list(object({
    name        = string
    access_type = optional(string, "private")
    immutability_policy = optional(object({
      period_in_days = number
      locked         = optional(bool, false)
    }), null)
  })) | Containers to be created. | `[]` | false |
| tables | list(string) | Tables to be created. | `[]` | false |
| diagnostic_settings | object({
    enabled                    = bool
    log_analytics_workspace_id = optional(string, null)
    storage_account_id         = optional(string, null)
  }) | Diagnostic settings for access logging (control and data plane). Mandatory for audit use case to track all access operations. | `{
  "enabled": false,
  "log_analytics_workspace_id": null
}` | false |
| tags | map(any) | A map of tags to assign to all resources created by this module. | `` | true |
| override_infrastructure_encryption | bool | When set to true, disables infrastructure encryption even if the use case configuration would enable it. Useful for audit use case to prevent storage account recreation when infrastructure encryption was enabled by default. | `false` | false |
| blob_features | object({
    restore_policy_days   = optional(number, 0)
    delete_retention_days = optional(number, 0)
    last_access_time      = optional(bool, false)
    versioning            = optional(bool, false)
    change_feed = optional(object({
      enabled           = optional(bool, false)
      retention_in_days = optional(number, 0)
    }), { enabled = false })
    immutability_policy = optional(object({
      enabled                       = optional(bool, false)
      allow_protected_append_writes = optional(bool, false)
      period_since_creation_in_days = optional(number, 730)
      state                         = optional(string, null)
    }), { enabled = false })
  }) | Advanced blob features like versioning, change feed, immutability, and retention policies. | `{
  "change_feed": {
    "enabled": false,
    "retention_in_days": 0
  },
  "delete_retention_days": 0,
  "immutability_policy": {
    "enabled": false
  },
  "last_access_time": false,
  "restore_policy_days": 0,
  "versioning": false
}` | false |
| network_rules | object({
    default_action             = string
    bypass                     = list(string)
    ip_rules                   = list(string)
    virtual_network_subnet_ids = list(string)
  }) | Defines network rules for the storage account:
- `default_action`: Default action when no rules match ('Deny' or 'Allow').
- `bypass`: Services bypassing restrictions (valid values: 'Logging', 'Metrics', 'AzureServices').
- `ip_rules`: List of IPv4 addresses or CIDR ranges.
- `virtual_network_subnet_ids`: List of subnet resource IDs.
Defaults to denying all traffic unless explicitly allowed.
 | `{
<output too long - dropped 276 lines from the middle>

1. **Start with unlocked** for testing and validation
2. **Lock only when confident** - it's permanent
3. **Use container-level policies** for legal hold flexibility
4. **Keep legal hold tags unlocked** - separate compliance (locked) from investigation (unlocked) containers
5. **Monitor with alerts** - set up Azure Monitor alerts for policy changes
6. **Document legal holds** - maintain external records of why legal holds were placed
7. **Regular compliance audits** - verify policies are still active and correct
8. **Backup legal hold tags** - keep a record of active legal holds outside Azure

## Troubleshooting

### Cannot delete storage account

**Cause**: Locked immutability policy or active legal holds
**Solution**:

1. Check policy state: `az storage account show --name <name> --query "immutableStorageWithVersioning.immutabilityPolicy.state"`
2. If "Locked", the account cannot be deleted until all data expires
3. Check legal holds: `az storage container legal-hold show --account-name <name> --container-name <container>`
4. Clear legal holds if present, then wait for retention period to expire

### Cannot modify container policy

**Cause**: Policy is locked or legal hold is active
**Solution**:

- For locked policies: Can only extend retention, never shorten or delete
- For legal holds: Clear all legal hold tags first

### Legal hold tags not accepted

**Cause**: Invalid tag format
**Solution**: Ensure tags are:

- 3-23 characters
- Alphanumeric only (no special characters)
- Maximum 10 tags per container

## References

- [Azure Immutable Storage Overview](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [SEC 17a-4(f) Compliance](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-sec-17a-4)
- [GDPR Compliance in Azure](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-gdpr)
- [NIS2 Directive Compliance](https://www.enisa.europa.eu/topics/cybersecurity-policy/nis-directive-new)

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_storage_account"></a> [azure\_storage\_account](#module\_azure\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_log_analytics_workspace.law](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/log_analytics_workspace) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->


#### complete

**Readme:**

# complete

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_storage_account"></a> [azure\_storage\_account](#module\_azure\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_user_assigned_identity.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
```

</details>


### ✅ `terraform-get_module_details`

<details>
<summary>Arguments</summary>

```json
{
  "module_id": "pagopa-dx/azure-cosmos-account/azurerm/0.4.0"
}
```

</details>

<details>
<summary>149 lines</summary>

```
# registry://modules/pagopa-dx/azure-cosmos-account

**Description:** Provisions an Azure Cosmos DB account with monitoring and network settings

**Module Version:** 0.4.0

**Namespace:** pagopa-dx

**Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account

### Inputs

| Name | Type | Description | Default | Required |
|---|---|---|---|---|
| use_case | string | Specifies the use case for the Cosmos DB Account. Allowed values are 'default' and 'development'. | `"default"` | false |
| private_dns_zone_resource_group_name | string | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group. | `null` | false |
| alerts | object({
    enabled         = bool
    action_group_id = optional(string, null)
    thresholds = optional(object({
      provisioned_throughput_exceeded = optional(number, null)
    }), {})
  }) | Alerts configuration for Cosmos DB account. | `{
  "enabled": true
}` | false |
| diagnostic_settings | object({
    enabled                                   = bool
    log_analytics_workspace_id                = optional(string)
    diagnostic_setting_destination_storage_id = optional(string)
  }) | Define if diagnostic settings should be enabled.
If enabled, specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and
optionally the ID of the Storage Account where logs should be sent.
 | `{
  "diagnostic_setting_destination_storage_id": null,
  "enabled": false,
  "log_analytics_workspace_id": null
}` | false |
| resource_group_name | string | The name of the resource group where resources will be deployed. | `` | true |
| subnet_pep_id | string | The ID of the subnet designated for private endpoints. | `null` | false |
| primary_geo_location | object({
    location       = optional(string, null)
    zone_redundant = optional(bool, true)
  }) | The primary geo-location for the Cosmos DB account. Specify 'location' to deploy the account in a region other than the default. | `{
  "location": null,
  "zone_redundant": true
}` | false |
| secondary_geo_locations | list(object({
    location          = optional(string, null)
    failover_priority = optional(number, null)
    zone_redundant    = optional(bool, true)
  })) | Secondary geo locations for Cosmos DB account. Failover priority determines the order in which regions will take over in case of a regional outage. If failover priority is not set, the items order is used. | `[]` | false |
| customer_managed_key | object({
    enabled                   = optional(bool, false)
    user_assigned_identity_id = optional(string, null)
    key_vault_key_id          = optional(string, null)
  }) | Customer managed key to use for encryption | `{
  "enabled": false
}` | false |
| force_public_network_access_enabled | bool | Specifies whether public network access is allowed for the Cosmos DB account. Defaults to false. | `false` | false |
| consistency_policy | object({
    consistency_preset      = optional(string)
    consistency_level       = optional(string, "Preset")
    max_interval_in_seconds = optional(number, 0)
    max_staleness_prefix    = optional(number, 0)
  }) | Defines the consistency policy for CosmosDB. Use 'consistency_preset' for predefined configurations, or set it to 'custom' for manual configuration. Presets include: 'default' (Session consistency), 'high_consistency' (Strong), 'high_performance' (Eventual), and 'balanced_staleness' (BoundedStaleness). For custom configuration, specify 'consistency_level' and, if using BoundedStaleness, 'max_interval_in_seconds' and 'max_staleness_prefix'. Refer to https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels for more details. | `` | true |
| authorized_teams | object({
    writers = optional(list(string), []),
    readers = optional(list(string), [])
  }) | Object containing lists of principal IDs (Azure AD object IDs) of product teams to be granted read or write permissions on the Cosmos DB account. These represent the teams within the organization that need access to this resource. | `{
  "readers": [],
  "writers": []
}` | false |
| tags | map(any) | A map of tags to assign to the resources. | `` | true |
| environment | object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  }) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | `` | true |

### Outputs

| Name | Description |
|---|---|
| id | The ID of the Azure Cosmos DB account. |
| resource_group_name | The name of the resource group containing the Azure Cosmos DB account. |
| endpoint | The primary endpoint URL of the Azure Cosmos DB account. |
| read_endpoints | A list of read endpoints for the Azure Cosmos DB account. |
| write_endpoints | A list of write endpoints for the Azure Cosmos DB account. |
| diagnostic_settings | Details of the diagnostic settings configured for the Cosmos DB Account. |
<output too long - dropped 19 lines from the middle>

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 4.10.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_cosmos_db"></a> [cosmos\_db](#module\_cosmos\_db) | pagopa-dx/azure-cosmos-account/azurerm | ~> 0.4 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_user_assigned_identity.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_monitor_action_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_action_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->


#### network_access

**Readme:**

# network_access

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.7.1 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_private_cosmos_account"></a> [private\_cosmos\_account](#module\_private\_cosmos\_account) | pagopa-dx/azure-cosmos-account/azurerm | >= 0.3 |
| <a name="module_public_cosmos_account"></a> [public\_cosmos\_account](#module\_public\_cosmos\_account) | pagopa-dx/azure-cosmos-account/azurerm | >= 0.3 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_group.private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group) | resource |
| [azurerm_container_group.public_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group) | resource |
| [azurerm_cosmosdb_sql_container.private_items](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_container) | resource |
| [azurerm_cosmosdb_sql_container.public_items](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_container) | resource |
| [azurerm_cosmosdb_sql_database.private_db](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_database) | resource |
| [azurerm_cosmosdb_sql_database.public_db](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_database) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ci_private_cosmos_private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ci_private_cosmos_public_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ci_public_cosmos_private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ci_public_cosmos_public_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_resource_group.e2e_cdb](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [dx_available_subnet_cidr.private_app](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [azurerm_resource_group.e2e](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_virtual_network.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_private_account_name"></a> [private\_account\_name](#output\_private\_account\_name) | n/a |
| <a name="output_private_app_ip_address"></a> [private\_app\_ip\_address](#output\_private\_app\_ip\_address) | n/a |
| <a name="output_public_account_name"></a> [public\_account\_name](#output\_public\_account\_name) | n/a |
| <a name="output_public_app_ip_address"></a> [public\_app\_ip\_address](#output\_public\_app\_ip\_address) | n/a |
<!-- END_TF_DOCS -->
```

</details>


### ✅ `terraform-get_provider_details`

<details>
<summary>Arguments</summary>

```json
{
  "provider_doc_id": "11349628"
}
```

</details>

<details>
<summary>138 lines</summary>

````
---
# generated by https://github.com/hashicorp/terraform-plugin-docs
page_title: "resource_name function - terraform-provider-azure"
subcategory: ""
description: |-
  Return Azure dx resources naming convention
---

# function: resource_name

Given a name, a resource name, an instance number and a resource type, returns the Azure dx resources naming convention.

## Example Usage

```terraform
# Generates a resource name based on fiven parameters.
# NOTE: Domain value is optional
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    domain = "test",
    name = "app",
    resource_type = "blob_private_endpoint",
    instance_number = 1,
  })
}
```

## Signature

<!-- signature generated by tfplugindocs -->

```text
resource_name(configuration map of string) string
```

## Arguments

<!-- arguments generated by tfplugindocs -->

1. `configuration` (Map) A map containing the following keys: prefix, environment, location, domain (Optional), name, resource_type and instance_number.

| Name                       | Value Type | Required | Description                                                                          |
| :------------------------- | :--------: | :------: | :----------------------------------------------------------------------------------- |
| prefix                     |   String   |   Yes    | Prefix that define the repository domain (Max 2 characters)                          |
| environment (or env_short) |   String   |   Yes    | Environment where the resources will be deployed (d, u or p).                        |
| location                   |   String   |   Yes    | Location where the resources will be deployed (itn/italynorth or weu/westeurope)     |
| domain                     |   String   |    No    | Domain grouping (optional).                                                          |
| name (or app_name)         |   String   |    No    | Resource name (optional, cannot overlap with resource type abbreviation).            |
| resource_type              |   String   |   Yes    | Type of the resource (see the table below)                                           |
| instance_number            |  Integer   |   Yes    | Instance number of the resource (1-99), also accepts string format (e.g. "02", "4"). |

### Resource Types

The following table lists the resource types and their abbreviations used in the resource_name function:

| Type                                      |   Abbreviation   |
| :---------------------------------------- | :--------------: |
| ai_search                                 |       srch       |
| api_management                            |       apim       |
| api_management_autoscale                  |     apim-as      |
| apim_network_security_group               |     apim-nsg     |
| apim_subnet                               |    apim-snet     |
| apim_private_endpoint                     |     apim-pep     |
| app_configuration                         |      appcs       |
| app_configuration_private_endpoint        |    appcs-pep     |
| app_gateway                               |       agw        |
| app_private_endpoint                      |     app-pep      |
| app_service                               |       app        |
| app_service_plan                          |       asp        |
| app_slot_private_endpoint                 | staging-app-pep  |
| app_subnet                                |     app-snet     |
| application_insights                      |       appi       |
| blob_private_endpoint                     |     blob-pep     |
| function_blob_private_endpoint            |  func-blob-pep   |
| dfunction_blob_private_endpoint           |  dfunc-blob-pep  |
| blob_storage                              |       blob       |
| cdn_frontdoor_endpoint                    |       fde        |
| cdn_frontdoor_origin                      |       fdo        |
| cdn_frontdoor_origin_group                |       fdog       |
| cdn_frontdoor_profile                     |       afd        |
| cdn_frontdoor_route                       |       cdnr       |
| cdn_monitor_diagnostic_setting            |       cdnp       |
| monitor_alert_sbns_active                 |   sbns-act-ma    |
| monitor_alert_sbns_dlq                    |   sbns-dlq-ma    |
| container_app                             |        ca        |
| container_app_environment                 |       cae        |
| container_app_job                         |       caj        |
| container_app_private_endpoint            |     cae-pep      |
| container_app_subnet                      |     cae-snet     |
| container_instance                        |        ci        |
| container_instance_subnet                 |     ci-snet      |
| cosmos_db                                 |      cosmos      |
| cosmos_db_nosql                           |      cosno       |
| cosmos_private_endpoint                   |    cosno-pep     |
| customer_key_cosmos_db_nosql              |    cosno-cmk     |
| customer_key_storage_account              |      stcmk       |
| durable_function_storage_account          |       stfd       |
| eventhub_namespace                        |      evhns       |
| eventhub_private_endpoint                 |    evhns-pep     |
| file_private_endpoint                     |     file-pep     |
| function_file_private_endpoint            |  func-file-pep   |
| dfunction_file_private_endpoint           |  dfunc-file-pep  |
| file_storage                              |       file       |
| function_app                              |       func       |
| function_private_endpoint                 |     func-pep     |
| function_slot_private_endpoint            | staging-func-pep |
| function_storage_account                  |       stfn       |
| function_subnet                           |    func-snet     |
| key_vault                                 |        kv        |
| key_vault_private_endpoint                |      kv-pep      |
| load_testing                              |        lt        |
| log_analytics                             |       log        |
| managed_identity                          |        id        |
| nat_gateway                               |        ng        |
| network_security_group                    |       nsg        |
| postgre_endpoint                          |     psql-ep      |
| postgre_private_endpoint                  |     psql-pep     |
| postgre_replica_private_endpoint          | psql-pep-replica |
| postgresql                                |       psql       |
| postgresql_replica                        |   psql-replica   |
| private_endpoint                          |       pep        |
| private_endpoint_subnet                   |     pep-snet     |
| public_ip                                 |       pip        |
| queue_private_endpoint                    |    queue-pep     |
| function_queue_private_endpoint           |  func-queue-pep  |
| dfunction_queue_private_endpoint          | dfunc-queue-pep  |
| queue_storage                             |      queue       |
| redis_cache                               |      redis       |
| resource_group                            |        rg        |
| servicebus_namespace                      |       sbns       |
| servicebus_private_endpoint               |     sbns-pep     |
| static_web_app                            |      stapp       |
| api_center                                |       apic       |
| storage_account                           |        st        |
| subnet                                    |       snet       |
| table_private_endpoint                    |    table-pep     |
| function_table_private_endpoint           |  func-table-pep  |
| dfunction_table_private_endpoint          | dfunc-table-pep  |
| table_storage                             |      table       |
| virtual_machine                           |        vm        |
| virtual_network                           |       vnet       |
| dns_forwarding_ruleset                    |      dnsfrs      |
| dns_private_resolver                      |      dnspr       |
| dns_private_resolver_inbound_endpoint     |        in        |
| dns_private_resolver_outbound_endpoint    |       out        |
| dns_private_resolver_virtual_network_link |  dnsprvnetlink   |
| virtual_network_gateway                   |       vgw        |
| local_network_gateway                     |       lgw        |
| virtual_network_gateway_connection        |      vgwcn       |
````

</details>


### ✅ `web_fetch`

**https://dx.pagopa.it/docs/azure/using-azure-registry-provider**

<details>
<summary>Arguments</summary>

```json
{
  "max_length": 20000,
  "url": "https://dx.pagopa.it/docs/azure/using-azure-registry-provider"
}
```

</details>

<details>
<summary>126 lines</summary>

````
Contents of https://dx.pagopa.it/docs/azure/using-azure-registry-provider:
The DX Azure Terraform provider simplifies the creation and management of Azure resources by enforcing standardized naming conventions and configurations. This provider is maintained by the [PagoPA organization](https://github.com/pagopa) and is available in the Terraform Registry under the namespace [pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx).

note

This documentation is relevant for all individual contributors using the DX Azure Terraform provider.

## Why Use the DX Azure Provider?[​](#why-use-the-dx-azure-provider "Direct link to Why Use the DX Azure Provider?")

The DX Azure provider offers several advantages for managing Azure resources:

*   **Consistency**: Ensures resources follow a unified naming convention, reducing errors and improving maintainability.
*   **Ease of Use**: Abstracts complex configurations into reusable functions, simplifying resource creation.
*   **Integration**: Seamlessly integrates with Terraform workflows and pipelines, enabling efficient infrastructure management.

## Installation[​](#installation "Direct link to Installation")

To use the DX Azure provider, include it in your Terraform configuration as follows:

```
terraform {  required_providers {    dx = {      source  = "pagopa-dx/azure"      version = "~> 0.0"    }  }}provider "dx" {}
```

### Provider Configuration[​](#provider-configuration "Direct link to Provider Configuration")

The DX Azure provider accepts the following inputs (all currently optional):

Name

Type

Required

Description

`prefix`

String

No

Project prefix (2-4 characters).

`environment`

String

No

Deployment environment (d, u, or p).

`location`

String

No

Deployment location (itn/italynorth or weu/westeurope).

`domain`

String

No

Optional domain for naming.

## Functions[​](#functions "Direct link to Functions")

The DX Azure provider includes a `resource_name` function to generate standardized resource names.

### resource\_name Function[​](#resource_name-function "Direct link to resource_name Function")

Generates a resource name based on the standardized prefix and additional parameters.

#### Inputs[​](#inputs "Direct link to Inputs")

Name

Type

Required

Description

`prefix`

String

Yes

Prefix that defines the repository domain.

`environment`

String

Yes

Deployment environment (d, u, or p).

`location`

String

Yes

Deployment location (itn, weu, italynorth or westeurope).

`domain`

String

No

Optional value specifying the domain.

`name`

String

Yes

Name of the resource.

`resource_type`

String

Yes

Type of the resource. The list of supported resource types can be found in the [documentation table](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/functions/resource_name#resource-types).

`instance_number`

Integer

Yes

Instance number of the resource.

#### Example[​](#example "Direct link to Example")

```
output "resource_name" {  value = provider::dx::resource_name({    prefix = "dx",    environment = "d",    location = "itn",    domain = "test",    name = "app",    resource_type = "api_management",    instance_number = 1,  })}
```

**Output**: `dx-d-itn-app-apim-pep-01`

note

To call a function, use the syntax: `provider::PROVIDER_NAME::FUNCTION_NAME(...)`.

## Resources[​](#resources "Direct link to Resources")

The DX Azure provider includes resources to simplify infrastructure management and automate common tasks.

### dx\_available\_subnet\_cidr Resource[​](#dx_available_subnet_cidr-resource "Direct link to dx_available_subnet_cidr Resource")

The `dx_available_subnet_cidr` resource automatically finds an available CIDR block for a new subnet within a specified Azure Virtual Network. This resource analyzes existing subnets and allocates a non-overlapping CIDR block, making it easier to manage subnet creation without manual CIDR calculations.

#### Inputs[​](#inputs-1 "Direct link to Inputs")

Name

Type

Required

Description

`virtual_network_id`

String

Yes

The Azure Resource ID of the Virtual Network (format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}`).

`prefix_length`

Integer

Yes

The desired prefix length for the new subnet CIDR (e.g., 24 for /24). Must be larger than the VNet prefix and smaller or equal to 29.

#### Outputs[​](#outputs "Direct link to Outputs")

Name

Type

Description

`id`

String

A unique identifier for the resource.

`cidr_block`

String

The allocated available CIDR block.

#### Example[​](#example-1 "Direct link to Example")

```
resource "dx_available_subnet_cidr" "next_cidr" {  virtual_network_id = azurerm_virtual_network.example.id  prefix_length      = 24  # For a /24 subnet}resource "azurerm_subnet" "new_subnet" {  name                 = "example-subnet"  resource_group_name  = azurerm_resource_group.example.name  virtual_network_name = azurerm_virtual_network.example.name  address_prefixes     = [dx_available_subnet_cidr.next_cidr.cidr_block]}
```

tip

When creating multiple subnets, use `depends_on` to ensure CIDR blocks are allocated sequentially and prevent overlaps:

```
resource "dx_available_subnet_cidr" "next_cidr_1" {  virtual_network_id = azurerm_virtual_network.this.id  prefix_length      = 24}resource "azurerm_subnet" "new_subnet_1" {  name                 = "my-new-subnet-1"  resource_group_name  = azurerm_resource_group.main.name  virtual_network_name = azurerm_virtual_network.main.name  address_prefixes     = [dx_available_subnet_cidr.next_cidr_1.cidr_block]}resource "dx_available_subnet_cidr" "next_cidr_2" {  virtual_network_id = azurerm_virtual_network.this.id  prefix_length      = 29  depends_on = [azurerm_subnet.new_subnet_1]}resource "azurerm_subnet" "new_subnet_2" {  name                 = "my-new-subnet-2"  resource_group_name  = azurerm_resource_group.main.name  virtual_network_name = azurerm_virtual_network.main.name  address_prefixes     = [dx_available_subnet_cidr.next_cidr_2.cidr_block]}
```

note

The `dx_available_subnet_cidr` resource is a virtual resource that doesn't create an actual Azure resource. It only calculates and reserves a CIDR block in your Terraform state. Changing either `virtual_network_id` or `prefix_length` after creation requires recreating the resource.

## Semantic Versioning[​](#semantic-versioning "Direct link to Semantic Versioning")

The DX Azure provider follows [semantic versioning](https://semver.org/), which ensures compatibility and stability across updates. When specifying the provider version in your Terraform configuration, use the `~>` operator to allow updates within the same major version:

```
version = "~> 0.0"
```

This ensures that breaking changes are avoided while allowing minor updates and patches. For example:

*   `~> 0.0` allows updates to `0.x.x` but not `1.0.0`.

When publishing a new release, ensure the version tag starts with a `v` (e.g., `v0.1.0`) as required by the [Terraform Registry](https://developer.hashicorp.com/terraform/registry/providers/publishing#creating-a-github-release).
````

</details>


### ✅ `web_fetch`

**https://dx.pagopa.it/docs/terraform/infra-folder-structure**

<details>
<summary>Arguments</summary>

```json
{
  "max_length": 20000,
  "url": "https://dx.pagopa.it/docs/terraform/infra-folder-structure"
}
```

</details>

<details>
<summary>8 lines</summary>

````
Contents of https://dx.pagopa.it/docs/terraform/infra-folder-structure:
Each GitHub repository should follow the same folder structure to hold infrastructure as code sources (Terraform HCL).

Everything should be placed under an `infra` folder at the root of the repository. This folder should contain multiple Terraform configurations:

The configurations are specific to an environment and are located in the `<env>` (es. dev, prod) subfolder. Each configuration can be used for multiple CSP regions.

The Terraform configurations have specific dependencies that must be respected during deployment:

```
infra/├─ bootstrapper/│  ├─ prod/│  │  ├─ main.tf│  ├─ dev/│  │  ├─ main.tf├─ core/│  ├─ prod/│  │  ├─ main.tf│  ├─ dev/│  │  ├─ main.tf├─ repository/│  ├─ main.tf├─ resources/│  ├─ _modules/│  │  ├─ functions/│  │  │   ├─ main.tf│  │  │   ├─ outputs.tf│  │  │   ├─ inputs.tf│  │  ├─ resource-groups/│  │  │   ├─ main.tf│  │  │   ├─ outputs.tf│  │  │   ├─ inputs.tf│  ├─ dev/│  │  |  ├─ main.tf│  ├─ prod/│  │  |  ├─ main.tf
```
````

</details>


### ✅ `web_fetch`

**https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings**

<details>
<summary>Arguments</summary>

```json
{
  "max_length": 20000,
  "url": "https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings"
}
```

</details>

<details>
<summary>35 lines</summary>

````
Contents of https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings:
## Overview[​](#overview "Direct link to Overview")

Using secret values in AppService (or FunctionApp) is a common challenge for developers. Terraform is often used to set secrets exported by other resources such as Storage Accounts, but this approach is not convenient as involves lot of downsides. In fact, anyone is able to read AppSettings, sensitive values are stored in plain text in Terraform state file and the secret rotation must be executed manually through Terraform.

This guide aims to instruct developers with best practices, providing guidelines for a better secrets management including the following benefits:

*   Updating a value in KeyVault does not require a Terraform Apply anymore: through the Azure Portal it is possible to force new values pulling from KeyVault
*   If a secret reference is broken (e.g. missing secret, lack of read permissions, etc.), Azure Portal highlights it in red
*   It becomes easier to track where secrets have been used

## How-To use Key Vault References as AppSettings[​](#how-to-use-key-vault-references-as-appsettings "Direct link to How-To use Key Vault References as AppSettings")

To use secrets from KeyVault as AppSettings values, you can follow these steps:

1.  Granting the AppService's system-assigned managed identity access to read secrets:
    
    *   For KeyVaults using Access Policies, assign `Get` and `List` permissions.
    *   For KeyVaults using RBAC, assign the `Key Vault Secrets User` role.
2.  By referencing the secrets from the AppService environment variables, using one between:
    
    *   `@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)`
    *   `@Microsoft.KeyVault(SecretUri=https://<kv-name>.vault.azure.net/secrets/<secret-name>)`

warning

Despite it is possible to refer a specific secret **version**, the practice is discouraged as it requires a manual secret rotation. More information is available in the [official KeyVault documentation](https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation#key-rotation-policy).

### Techniques to Facilitate the Code Refactoring[​](#techniques-to-facilitate-the-code-refactoring "Direct link to Techniques to Facilitate the Code Refactoring")

The shared approach requires some code refactoring. We recommend to encapsulate the logic in the submodule of your AppService/Functions Apps in something like:

```
locals {  local.function_apps.common_app_settings,  {    for s in var.app_settings :    s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${s.key_vault_secret_name})" : s.value  }}variable "app_settings" {  type = list(object({    name                  = string    value                 = optional(string, "")    key_vault_secret_name = optional(string)  }))  description = "AppSettings configuration"}
```

Then, the caller root module could use this code:

```
app_settings = [  {    name                  = "secret1"    key_vault_secret_name = "secret1"  },  {    name                  = "secret2"    key_vault_secret_name = "secret2"  },  {    name  = "plan1"    value = "plain value"  },]
```

### Managing Sensitive Resource Outputs[​](#managing-sensitive-resource-outputs "Direct link to Managing Sensitive Resource Outputs")

In some scenarios, the output of a Terraform module may include sensitive values, leading to the issue described above.

To address this, you should save the output value into KeyVault and reference it using the previously illustrated syntax.

To save a secret in the KeyVault:

```
resource "azurerm_key_vault_secret" "example" {  name         = "secret-sauce"  value        = "szechuan"  key_vault_id = azurerm_key_vault.example.id  tags = local.tags}
```

This code requires either the `Set` policy assignment or the `Key Vault Secrets Officer` role.

More info can be found in the [official KeyVault documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret).
````

</details>


### 💬 Copilot

Now let me gather additional information about networking patterns and search for more specific documentation:

### ✅ `web_fetch`

**https://dx.pagopa.it/docs/azure/azure-naming-convention**

<details>
<summary>Arguments</summary>

```json
{
  "max_length": 20000,
  "url": "https://dx.pagopa.it/docs/azure/azure-naming-convention"
}
```

</details>

<details>
<summary>14 lines</summary>

```
Contents of https://dx.pagopa.it/docs/azure/azure-naming-convention:
Having a naming convention for your Azure resources is critical for quickly identifying the resource type, associated workload, environment, and Azure region it is located in. By following a consistent format, you can include all the information needed to identify specific resource instances.

A good naming convention should capture key data about each resource, ensuring that the name is unique within its scope, defined by the resource type. This makes it easier to manage and organize resources within your enterprise infrastructure.

info

The DX Azure Terraform Provider includes a function to generate resource names according to this convention. For more information, refer to the [Using DX Azure Terraform Provider](/docs/azure/using-azure-registry-provider) guide.

The following is a description of the naming convention to be followed:

`<prefix>-<region>-[domain]-[appname]-<resource-type>-<instance-number>`

*   `prefix`: The currently used prefix, which includes the product name and environment (e.g., `io-p`).
*   `region`: The region where the resource was created, represented by a 3-letter code (valid values: `weu`, `neu`, `itn`, `gwc`).
*   `domain`: (Optional) The domain to which the resource is associated (e.g., `wallet`, `svc`, `msgs`). Omit this field for _shared_ resources (e.g., Application Gateway).
*   `appname`: (Optional) The application name of the resource (e.g., `session-manager`, `cms`). Only omit this field if you are creating a unique resource of its type (e.g., APIM, Application Gateway, WAF). In most cases, this field should be used.
*   `resource-type`: The name of the service you are using. Refer to the [Microsoft documentation](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations) for the correct name. Do not use patterns out of habit (e.g., `fn` for Function App).
*   `instance-number`: A two-digit number used to enumerate the resources (e.g., `01`, `02`, etc.).

The Terraform modules in the DX repository help you follow this pattern by automatically composing the names of your resources.
```

</details>


### ✅ `terraform-get_latest_provider_version`

<details>
<summary>Arguments</summary>

```json
{
  "namespace": "pagopa-dx",
  "name": "azure"
}
```

</details>

```
0.8.3
```


### ✅ `terraform-get_latest_provider_version`

<details>
<summary>Arguments</summary>

```json
{
  "namespace": "hashicorp",
  "name": "azurerm"
}
```

</details>

```
4.62.0
```


### ✅ `web_search`

**PagoPA DX Terraform Azure Cosmos DB serverless NoSQL configuration best practices**

<details>
<summary>Arguments</summary>

```json
{
  "query": "PagoPA DX Terraform Azure Cosmos DB serverless NoSQL configuration best practices"
}
```

</details>

````
{"type":"text","text":{"value":"Configuring Azure Cosmos DB NoSQL (serverless) with Terraform—especially for use within the PagoPA DX ecosystem—requires careful consideration of both Terraform patterns and Cosmos DB best practices. Below are tailored recommendations and references for a robust, production-ready setup.\n\n---\n\n### 1. Use of PagoPA DX Terraform Modules\n\n- PagoPA DX provides [a dedicated Terraform module](https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account) for Cosmos DB provisioning, which supports monitoring, network settings, geo-replication, and serverless mode. You should strongly consider using these production-ready, community-reviewed modules for standardization and built-in compliance.\n- To enable serverless, set the `tier=\"s\"` parameter in the module configuration. Example:\n  ```hcl\n  module \"cosmosdb\" {\n    source                   = \"pagopa/dx-azure-cosmos-account/azurerm\"\n    version                  = \"~> 0\"\n    environment              = var.environment\n    resource_group_name      = var.resource_group_name\n    tier                     = \"s\" # Enables serverless mode\n    ...\n  }\n  ```\n- The module also supports features like automatic failover, customer-managed keys, and continuous backup policies【3:1†source】.\n\n---\n\n### 2. Terraform Best Practices\n\n- **State Management:** Ensure your Terraform state is stored securely (e.g., in remote backends like Azure Storage with state locking).\n- **Separation of Concerns:** Use distinct files or modules for resource definitions, variables, and outputs—common practice for scalable codebases【3:4†source】【3:5†source】.\n- **Resource Naming:** Apply standardized naming conventions, ideally with a naming convention module such as `pagopa/dx-azure-naming-convention/azurerm`.\n- **Version Pinning:** Pin provider and module versions explicitly for reproducible environments.\n\n---\n\n### 3. Cosmos DB Serverless NoSQL: Configuration Best Practices\n\n#### Reliability & Security\n\n- **Multi-Region Redundancy:** For resilience, configure at least two geo_locations for the `azurerm_cosmosdb_account`.\n- **Consistency Levels:** Choose session or bounded staleness for most scenarios, but review workload requirements—PagoPA modules offer a `consistency_policy` for customization.\n- **Private Endpoints and Network Controls:** Disable public network access and use private endpoints when possible.\n- **Backup Policy:** Even for serverless, enable continuous or periodic backup policies where available【3:1†source】【3:7†source】.\n\n#### Performance & Cost\n\n- **Optimize Partition Keys:** Pick partition keys carefully to ensure even distribution and lowest latency. For example, `/id` for unique-identifier-based storage, or use workload-specific choices【3:3†source】【3:6†source】.\n- **Indexing Policy:** Adjust indexing for minimal RU consumption—exclude properties that are read-rarely or not queried.\n- **Autoscale:** Autoscale is not used in serverless mode, but monitor for usage patterns to consider upgrade to provisioned throughput if necessary in the future.\n\n#### Operations & Observability\n\n- **Monitoring Alerts:** Use the built-in metric alerting (such as for throttled RUs) for proactive monitoring.\n- **Tagging:** Apply comprehensive tags for cost control, ownership, and environment association (e.g., `environment`, `owner`, `cost_center`)【3:1†source】【3:6†source】.\n\n---\n\n### 4. Microsoft and Community Resources\n\n- **Official Microsoft Guidance:** Always refer to the [Well-Architected Framework for Cosmos DB](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/cosmos-db) for reliability, performance, and operational best practices【3:7†source】.\n- **Terraform Registry:** Extensive Cosmos DB Terraform code samples, including serverless setups, are available in both Microsoft Docs and the Terraform Registry【3:9†source】【3:2†source】.\n\n---\n\n#### Example Cosmos DB Serverless Resource\n```hcl\nresource \"azurerm_cosmosdb_account\" \"example\" {\n  ...\n  consistency_policy {\n    consistency_level = \"Session\"\n  }\n  geo_location {\n    location          = var.location\n    failover_priority = 0\n  }\n  capabilities {\n    name = \"EnableServerless\"\n  }\n  public_network_access_enabled = false\n  ...\n}\n```\nFor a full working example, see [this sample by Cloud Engineer Skills](https://cloudengineerskills.com/posts/terraform-cosmos-db/) or PagoPA’s own modules.\n\n---\n\n### References\n- [PagoPA Cosmos DB Terraform Module](https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account)【3:1†source】\n- [Microsoft Learn: Manage Cosmos DB with Terraform](https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-terraform)【3:0†source】\n- [Best Practices for NoSQL with Cosmos DB – Microsoft Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/cosmos-db)【3:7†source】\n- [Terraform Resource Documentation - azurerm_cosmosdb_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account)【3:2†source】\n- [Sample Production Terraform Setup (Cloud Engineer Skills)](https://cloudengineerskills.com/posts/terraform-cosmos-db/)【3:3†source】\n\nIf you need a detailed, ready-to-use `main.tf` or module snippet for PagoPA DX environments (or integration specifics for CI/CD pipelines), let me know!","annotations":[{"text":"【3:1†source】","start_index":1227,"end_index":1239,"url_citation":{"title":"GitHub - pagopa-dx/terraform-azurerm-azure-cosmos-account: Provisions ...","url":"https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account"}},{"text":"【3:4†source】","start_index":1564,"end_index":1576,"url_citation":{"title":"Working with Terraform | DX","url":"https://dx.pagopa.it/docs/terraform"}},{"text":"【3:5†source】","start_index":1576,"end_index":1588,"url_citation":{"title":"Managing Azure Cosmos DB with Terraform - thecloudpanda.com","url":"https://www.thecloudpanda.com/blog/azure-cosmos-terraform/"}},{"text":"【3:1†source】","start_index":2461,"end_index":2473,"url_citation":{"title":"GitHub - pagopa-dx/terraform-azurerm-azure-cosmos-account: Provisions ...","url":"https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account"}},{"text":"【3:7†source】","start_index":2473,"end_index":2485,"url_citation":{"title":"Architecture best practices for Azure Cosmos DB for NoSQL","url":"https://learn.microsoft.com/en-us/azure/well-architected/service-guides/cosmos-db"}},{"text":"【3:3†source】","start_index":2710,"end_index":2722,"url_citation":{"title":"Creating a Azure Cosmos DB NoSQL Account, Database, and Container using ...","url":"https://cloudengineerskills.com/posts/terraform-cosmos-db/"}},{"text":"【3:6†source】","start_index":2722,"end_index":2734,"url_citation":{"title":"Managing Azure Cosmos DB with Terraform - Azure and DevOps","url":"https://azuredevops.org/managing-azure-cosmos-db-with-terraform-11/"}},{"text":"【3:1†source】","start_index":3310,"end_index":3322,"url_citation":{"title":"GitHub - pagopa-dx/terraform-azurerm-azure-cosmos-account: Provisions ...","url":"https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account"}},{"text":"【3:6†source】","start_index":3322,"end_index":3334,"url_citation":{"title":"Managing Azure Cosmos DB with Terraform - Azure and DevOps","url":"https://azuredevops.org/managing-azure-cosmos-db-with-terraform-11/"}},{"text":"【3:7†source】","start_index":3625,"end_index":3637,"url_citation":{"title":"Architecture best practices for Azure Cosmos DB for NoSQL","url":"https://learn.microsoft.com/en-us/azure/well-architected/service-guides/cosmos-db"}},{"text":"【3:9†source】","start_index":3801,"end_index":3813,"url_citation":{"title":"Terraform Samples - Azure Cosmos DB | Microsoft Learn","url":"https://learn.microsoft.com/en-us/azure/cosmos-db/samples-terraform"}},{"text":"【3:2†source】","start_index":3813,"end_index":3825,"url_citation":{"title":"azurerm_cosmosdb_account | Resources - Terraform Registry","url":"https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account"}},{"text":"【3:1†source】","start_index":4468,"end_index":4480,"url_citation":{"title":"GitHub - pagopa-dx/terraform-azurerm-azure-cosmos-account: Provisions ...","url":"https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account"}},{"text":"【3:0†source】","start_index":4606,"end_index":4618,"url_citation":{"title":"Create and Manage With Terraform - Azure Cosmos DB","url":"https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-terraform"}},{"text":"【3:7†source】","start_index":4784,"end_index":4796,"url_citation":{"title":"Architecture best practices for Azure Cosmos DB for NoSQL","url":"https://learn.microsoft.com/en-us/azure/well-architected/service-guides/cosmos-db"}},{"text":"【3:2†source】","start_index":4958,"end_index":4970,"url_citation":{"title":"azurerm_cosmosdb_account | Resources - Terraform Registry","url":"https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account"}},{"text":"【3:3†source】","start_index":5092,"end_index":5104,"url_citation":{"title":"Creating a Azure Cosmos DB NoSQL Account, Database, and Container using ...","url":"https://cloudengineerskills.com/posts/terraform-cosmos-db/"}}]},"bing_searches":[{"text":"PagoPA DX Terraform Azure Cosmos DB serverless NoSQL configuration best practices","url":"https://www.bing.com/search?q=PagoPA+DX+Terraform+Azure+Cosmos+DB+serverless+NoSQL+configuration+best+practices"}],"annotations":null}
````


### 💬 Copilot

Perfect! Now let me compile a comprehensive structured report with all the gathered information:

---

# **PagoPA DX Terraform Best Practices Research Report**

## **Executive Summary**
Successfully gathered comprehensive documentation for generating Terraform configuration for Azure infrastructure with Function App (Node.js 20), Storage Account, and Cosmos DB (NoSQL serverless) following PagoPA DX conventions.

---

## **1. CODE STYLE & FOLDER STRUCTURE**

### **✅ What I Found:**

**File Organization Pattern:**
- `locals.tf` - Local values, naming configs, computed values
- `providers.tf` - Terraform block, required providers, backend, provider configs  
- `variables.tf` - Input variables with descriptions and validations
- `outputs.tf` - Output values with descriptions
- `main.tf` or `\<resource\>.tf` - Resources and modules (e.g., `function.tf`, `storage.tf`, `cosmos.tf`)
- `data.tf` - Data sources

**Folder Structure:**
```
infra/
├─ resources/
│  ├─ dev/
│  │  ├─ locals.tf
│  │  ├─ providers.tf
│  │  ├─ variables.tf
│  │  ├─ outputs.tf
│  │  ├─ main.tf
│  ├─ prod/
│  │  ├─ locals.tf
│  │  ├─ providers.tf
│  │  ├─ main.tf
```

**Standard Template - locals.tf:**
```hcl
locals {
  environment = {
    prefix          = "\<product\>"      # e.g., "io", "cgn"
    env_short       = "p"              # p, d, u
    location        = "italynorth"
    domain          = "\<domain\>"       # optional
    app_name        = "\<app\>"
    instance_number = "01"
  }
  
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"            # Based on folder: Prod, Dev, Uat
    BusinessUnit   = "\<business-unit\>"
    Source         = "https://github.com/pagopa/\<repo\>/blob/main/infra/resources/prod"
    ManagementTeam = "\<team\>"
  }
}
```

**Standard Template - providers.tf:**
```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~\> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~\> 0.8"  # Latest: 0.8.3
    }
  }
  
  backend "azurerm" {
    resource_group_name  = "\<tfstate-rg\>"
    storage_account_name = "\<tfstate-storage\>"
    container_name       = "terraform-state"
    key                  = "\<project\>.resources.\<env\>.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "dx" {}
```

---

## **2. NAMING CONVENTIONS**

### **✅ What I Found:**

**DX Provider Function:** `provider::dx::resource_name()`

**Pattern:** `\<prefix\>-\<region\>-[domain]-[appname]-\<resource-type\>-\<instance-number\>`

**Usage Example:**
```hcl
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }
  
  # Function App name
  function_app_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "function_app" }
  ))
  
  # Storage Account name
  storage_account_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "storage_account" }
  ))
  
  # Cosmos DB name
  cosmos_db_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "cosmos_db_nosql" }
  ))
}
```

**Relevant Resource Types:**
- `function_app` → `func`
- `function_storage_account` → `stfn`
- `storage_account` → `st`
- `cosmos_db_nosql` → `cosno`
- `function_subnet` → `func-snet`
- `resource_group` → `rg`
- `function_private_endpoint` → `func-pep`
- `blob_private_endpoint` → `blob-pep`
- `cosmos_private_endpoint` → `cosno-pep`

---

## **3. REQUIRED TAGS**

### **✅ What I Found:**

**Complete List of Mandatory Tags:**
```hcl
locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"  # Budget tracking
    CreatedBy      = "Terraform"                      # Always "Terraform"
    Environment    = "Prod"                           # "Prod", "Dev", "Uat"
    BusinessUnit   = "App IO"                         # Product/business unit
    Source         = "https://github.com/pagopa/\<repo\>/blob/main/infra/resources/prod"
    ManagementTeam = "IO Platform"                    # Responsible team
  }
}
```

**Environment Values Mapping:**
- `dev/` folder → `"Dev"`
- `uat/` folder → `"Uat"`
- `prod/` folder → `"Prod"`

**Common BusinessUnit Values:**
- `App IO`, `CGN`, `Carta della Cultura`, `IT Wallet`, `DevEx`

**Common ManagementTeam Values:**
- `IO Platform`, `IO Wallet`, `IO Comunicazione`, `IO Enti & Servizi`, `Developer Experience`

**Usage Pattern:**
```hcl
resource "azurerm_resource_group" "example" {
  name     = "example-rg"
  location = "italynorth"
  tags     = local.tags
}

module "function_app" {
  source = "pagopa-dx/azure-function-app/azurerm"
  tags   = local.tags
  # ...
}
```

---

## **4. DX MODULES**

### **✅ What I Found:**

#### **Azure Function App Module**
- **Module ID:** `pagopa-dx/azure-function-app/azurerm/4.3.0`
- **Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-function-app
- **Latest Version:** `4.3.0`
- **Downloads:** 19,443

**Key Features:**
- Built-in storage account creation
- Subnet creation with automatic CIDR allocation
- Private endpoint support
- Application Insights integration
- Node.js 20 support (default)
- Slot deployment support
- Use cases: `default`, `high_load`

**Usage Example:**
```hcl
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~\> 4.3"
  
  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name
  
  virtual_network = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }
  
  subnet_cidr   = "10.0.1.0/24"  # Or leave null to auto-create
  subnet_pep_id = data.azurerm_subnet.pep.id
  
  node_version         = 20
  stack                = "node"
  use_case             = "default"  # or "high_load"
  health_check_path    = "/api/health"
  
  application_insights_connection_string = data.azurerm_application_insights.ai.connection_string
  
  app_settings = {
    "COSMOS_ENDPOINT" = module.cosmos.endpoint
    "STORAGE_ACCOUNT" = "@Microsoft.KeyVault(VaultName=${data.azurerm_key_vault.kv.name};SecretName=storage-connection-string)"
  }
  
  tags = local.tags
}
```

#### **Azure Storage Account Module**
- **Module ID:** `pagopa-dx/azure-storage-account/azurerm/2.1.4`
- **Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-storage-account
- **Latest Version:** `2.1.4`
- **Downloads:** 16,374

**Key Features:**
- Private endpoint support
- Subservices: blob, file, queue, table
- Use cases: `default`, `audit`, `delegated_access`, `development`, `archive`
- Static website hosting
- Customer-managed keys
- Diagnostic settings

**Usage Example:**
```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~\> 2.1"
  
  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name
  
  use_case = "default"
  
  subnet_pep_id = data.azurerm_subnet.pep.id
  
  subservices_enabled = {
    blob  = true
    queue = true
    table = true
  }
  
  containers = [
    {
      name        = "uploads"
      access_type = "private"
    }
  ]
  
  tags = local.tags
}
```

#### **Azure Cosmos DB Module**
- **Module ID:** `pagopa-dx/azure-cosmos-account/azurerm/0.4.0`
- **Source:** https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account
- **Latest Version:** `0.4.0`
- **Downloads:** 4,773

**Key Features:**
- NoSQL API support
- Serverless capability
- Private endpoint support
- Multi-region replication
- Consistency policy presets
- Use cases: `default`, `development`

**Usage Example:**
```hcl
module "cosmos_db" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~\> 0.4"
  
  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name
  
  use_case = "default"
  
  subnet_pep_id = data.azurerm_subnet.pep.id
  
  consistency_policy = {
    consistency_preset = "default"  # Session consistency
  }
  
  # Enable serverless by NOT setting provisioned throughput
  # Serverless is enabled via capabilities in azurerm_cosmosdb_account
  
  primary_geo_location = {
    location       = "italynorth"
    zone_redundant = true
  }
  
  alerts = {
    enabled         = true
    action_group_id = data.azurerm_monitor_action_group.alerts.id
  }
  
  tags = local.tags
}

# Create database and containers after account
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "my-database"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = module.cosmos_db.name
}

resource "azurerm_cosmosdb_sql_container" "container" {
  name                = "items"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = module.cosmos_db.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_paths = ["/id"]
}
```

---

## **5. MODULE VERSIONS**

### **✅ What I Found:**

**Provider Versions (Latest):**
- `hashicorp/azurerm`: `4.62.0` → Use `~\> 4.0`
- `pagopa-dx/azure`: `0.8.3` → Use `~\> 0.8`

**Module Versions (Use ~\> for automatic patch updates):**
```hcl
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~\> 4.3"  # Latest: 4.3.0
}

module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~\> 2.1"  # Latest: 2.1.4
}

module "cosmos_db" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~\> 0.4"  # Latest: 0.4.0
}
```

---

## **6. SECRET MANAGEMENT**

### **✅ What I Found:**

**Pattern: Key Vault References in AppSettings**

**Syntax:**
```hcl
# Option 1: VaultName + SecretName
"@Microsoft.KeyVault(VaultName=\<kv-name\>;SecretName=\<secret-name\>)"

# Option 2: SecretUri
"@Microsoft.KeyVault(SecretUri=https://\<kv-name\>.vault.azure.net/secrets/\<secret-name\>)"
```

**Prerequisites:**
1. Grant Function App's system-assigned managed identity access to Key Vault:
   - **Access Policies:** `Get` and `List` permissions
   - **RBAC:** `Key Vault Secrets User` role

**Usage Example:**
```hcl
module "function_app" {
  source = "pagopa-dx/azure-function-app/azurerm"
  
  app_settings = {
    # Plain value
    "ENVIRONMENT"       = "production"
    
    # Key Vault reference
    "COSMOS_KEY"        = "@Microsoft.KeyVault(VaultName=${data.azurerm_key_vault.kv.name};SecretName=cosmos-primary-key)"
    "STORAGE_CONN_STR"  = "@Microsoft.KeyVault(VaultName=${data.azurerm_key_vault.kv.name};SecretName=storage-connection-string)"
  }
}
```

**Best Practices:**
- ✅ Never reference specific secret versions (enables automatic rotation)
- ✅ Store sensitive outputs in Key Vault, reference them in app settings
- ✅ Use system-assigned managed identities (avoid service principals)

**Storing Secrets in Key Vault:**
```hcl
resource "azurerm_key_vault_secret" "cosmos_key" {
  name         = "cosmos-primary-key"
  value        = module.cosmos_db.primary_key
  key_vault_id = data.azurerm_key_vault.kv.id
  tags         = local.tags
}
```

---

## **7. NETWORKING PATTERNS**

### **✅ What I Found:**

**DX Provider Resource: `dx_available_subnet_cidr`**

**Purpose:** Automatically allocates non-overlapping CIDR blocks for new subnets within a Virtual Network.

**Usage Example:**
```hcl
# Automatic CIDR allocation
resource "dx_available_subnet_cidr" "function_subnet" {
  virtual_network_id = data.azurerm_virtual_network.vnet.id
  prefix_length      = 24  # /24 subnet
}

resource "azurerm_subnet" "function" {
  name                 = "func-snet-01"
  resource_group_name  = data.azurerm_resource_group.network.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.function_subnet.cidr_block]
}
```

**Multiple Subnets (Sequential Allocation):**
```hcl
# First subnet
resource "dx_available_subnet_cidr" "subnet1" {
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 24
}

resource "azurerm_subnet" "subnet1" {
  name                 = "subnet-1"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.subnet1.cidr_block]
}

# Second subnet - depends_on ensures sequential allocation
resource "dx_available_subnet_cidr" "subnet2" {
  virtual_network_id = azurerm_virtual_network.vnet.id
  prefix_length      = 29
  depends_on         = [azurerm_subnet.subnet1]
}

resource "azurerm_subnet" "subnet2" {
  name                 = "subnet-2"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.subnet2.cidr_block]
}
```

**Private Endpoint Pattern:**
```hcl
# Modules automatically create private endpoints when subnet_pep_id is provided
module "storage_account" {
  source        = "pagopa-dx/azure-storage-account/azurerm"
  subnet_pep_id = data.azurerm_subnet.pep.id  # Private endpoint subnet
  
  subservices_enabled = {
    blob = true  # Creates blob private endpoint
  }
}
```

---

## **8. ADDITIONAL FINDINGS**

### **Cosmos DB Serverless Configuration**

**✅ Key Information:**
- Enable serverless using `capabilities` block with `EnableServerless` capability
- Serverless does NOT support autoscale or provisioned throughput
- Consistency policy presets: `default` (Session), `high_consistency` (Strong), `high_performance` (Eventual)

**Example:**
```hcl
resource "azurerm_cosmosdb_account" "this" {
  name                = local.cosmos_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  
  capabilities {
    name = "EnableServerless"
  }
  
  consistency_policy {
    consistency_level = "Session"
  }
  
  geo_location {
    location          = "italynorth"
    failover_priority = 0
  }
  
  tags = local.tags
}
```

### **Variable Validation Pattern**

**✅ Best Practice:**
```hcl
variable "use_case" {
  type        = string
  description = "Function App use case. Allowed values: 'default', 'high_load'."
  default     = "default"
  
  validation {
    condition     = contains(["default", "high_load"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"high_load\"."
  }
}
```

### **Output Organization Pattern**

**✅ Best Practice:**
```hcl
output "function_app" {
  description = "Function App details"
  value = {
    id                = module.function_app.function_app.id
    name              = module.function_app.function_app.name
    default_hostname  = module.function_app.function_app.default_hostname
    principal_id      = module.function_app.function_app.principal_id
  }
}

output "storage_account" {
  description = "Storage Account details"
  value = {
    id   = module.storage_account.id
    name = module.storage_account.name
  }
}
```

---

## **9. GAPS & WHAT I DIDN'T FIND**

### **⚠️ Gaps Identified:**

1. **Cosmos DB Serverless in DX Module:**
   - The `pagopa-dx/azure-cosmos-account` module doesn't explicitly document serverless mode
   - Need to verify if serverless is enabled through `use_case` or requires manual `capabilities` block

2. **Complete Key Vault RBAC Patterns:**
   - Documentation shows Key Vault references but doesn't provide complete RBAC assignment examples
   - Missing example of assigning `Key Vault Secrets User` role to Function App managed identity

3. **Private DNS Zone Configuration:**
   - Modules accept `private_dns_zone_resource_group_name` but don't document how to create/reference DNS zones
   - Missing pattern for cross-subscription DNS zone references

4. **Application Insights Configuration:**
   - Function App module accepts Application Insights keys but doesn't show how to create/reference the resource
   - No example of diagnostic settings configuration

5. **Networking Dependencies:**
   - No clear documentation on VNet/subnet prerequisites before using DX modules
   - Missing pattern for data source references to existing network resources

---

## **10. RECOMMENDED NEXT STEPS**

To generate a complete Terraform configuration, you should:

1. **Clarify Cosmos DB serverless setup** with DX module (or use raw `azurerm_cosmosdb_account`)
2. **Create data sources** for existing infrastructure (VNet, subnets, Key Vault, Application Insights)
3. **Define RBAC assignments** for Function App → Key Vault and Cosmos DB access
4. **Configure Application Insights** resource or reference existing one
5. **Set up private DNS zones** or reference existing zones for private endpoints

---

## **CONCLUSION**

Successfully gathered comprehensive DX Terraform best practices including:
- ✅ Complete code style and folder structure templates
- ✅ Naming conventions with `provider::dx::resource_name()` function
- ✅ All 6 mandatory tags with usage patterns
- ✅ DX modules for Function App, Storage Account, and Cosmos DB with versions
- ✅ Secret management patterns with Key Vault references
- ✅ Networking patterns with `dx_available_subnet_cidr` resource

This information provides a solid foundation for generating PagoPA DX-compliant Terraform configurations.


---

<sub>⏱️ 2m 57s</sub>

### ✅ `bash`

**Create output directory**

$ mkdir -p /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output

```

<exited with exit code 0>
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/versions.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/versions.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/versions.tf with 232 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/providers.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/providers.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/providers.tf with 84 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/variables.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/variables.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/variables.tf with 2151 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/locals.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/locals.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/locals.tf with 1397 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/data.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/data.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/data.tf with 366 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/main.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/main.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/main.tf with 4605 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/outputs.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/outputs.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/outputs.tf with 1424 characters
```


---

<sub>⏱️ 5m 1s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/README.md**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/README.md

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output/README.md with 14137 characters
```


---

<sub>⏱️ 5m 11s</sub>

### 💬 Copilot

Completato! Ho generato il root module Terraform completo usando la skill **terraform-dx-best-practices-subagent**.

**File generati** in `/Users/christian.calabrese/Desktop/repository/dx/experiments/results/subagent/run-1/output`:
- `versions.tf` - Provider versions (azurerm ~\> 4.0, dx ~\> 0.8)
- `providers.tf` - Provider configurations
- `variables.tf` - Input variables con validazioni
- `locals.tf` - Naming con `provider::dx::resource_name()` e tag DX
- `data.tf` - Data sources (VNet, Key Vault)
- `main.tf` - Function App, Storage, Cosmos DB con moduli `pagopa-dx/*`
- `outputs.tf` - Output values
- `README.md` - Documentazione completa con processo di delega

**Processo subagent**: Il subagent ha raccolto documentazione DX completa (moduli v4.3.0/2.1.4/0.4.0, naming conventions, tag obbligatori, secret management). Tutti i requisiti soddisfatti tranne networking pattern `dx_available_subnet_cidr` (subnet auto-creata dal modulo Function App).

---

<sub>Generated by [GitHub Copilot CLI](https://github.com/features/copilot/cli)</sub>
