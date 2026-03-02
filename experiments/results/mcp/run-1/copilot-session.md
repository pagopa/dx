# 🤖 Copilot CLI Session

> **Session ID:** `58496fbc-9bfc-4992-a1d6-4b03713ff2d6`
> **Started:** 02/03/2026, 13:11:18
> **Duration:** 2m 22s
> **Exported:** 02/03/2026, 13:13:40

<sub>⏱️ 4s</sub>

### 👤 User

Usa esclusivamente la skill "terraform-dx-best-practices-mcp".


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

Scrivi i file Terraform direttamente nella cartella: /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output

Crea ogni file separatamente. Non scrivere blocchi di codice in chat. Al termine includi un breve README.md nella stessa cartella che spieghi come la skill ha recuperato la documentazione e le scelte fatte.

---

<sub>⏱️ 12s</sub>

### ✅ `skill`

**terraform-dx-best-practices-mcp**

<details>
<summary>Arguments</summary>

```json
{
  "skill": "terraform-dx-best-practices-mcp"
}
```

</details>

```
Skill "terraform-dx-best-practices-mcp" loaded successfully. Follow the instructions in the skill context.
```


---

<sub>⏱️ 25s</sub>

### ✅ `dx-pagopa_query_documentation`

**Terraform folder structure code style**

<details>
<summary>Arguments</summary>

```json
{
  "query": "Terraform folder structure code style",
  "number_of_results": 5
}
```

</details>

```
Result 1 (Score: 0.8625):
<output too long - dropped 40 lines from the middle>

```


---

<sub>⏱️ 24s</sub>

### ✅ `dx-pagopa_query_documentation`

**Azure naming convention provider::dx::resource_name**

<details>
<summary>Arguments</summary>

```json
{
  "query": "Azure naming convention provider::dx::resource_name",
  "number_of_results": 5
}
```

</details>

<details>
<summary>7 lines</summary>

```
Result 1 (Score: 0.9493):
# Using DX Azure Terraform Provider
> The DX Azure Terraform provider simplifies the creation and management of Azure
resources by enforcing standardized naming conventions and configurations. This
<output too long - dropped 189 lines from the middle>
Location: https://dx.pagopa.it/docs/terraform/code-style
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/terraform/code-style.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZP3T4MWKDX%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121143Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJHMEUCIBzTPobTjpXRGsHpFrBsNNXORGlBVplZ496FkC1p7bkfAiEA%2BC%2FgN1E7qkh%2FSyb2v7BQu5kMmxcs8ikSHliAQFbqw%2FAqnQMIhf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgwyMjU5MDMxMDM1ODMiDGn%2BfmGfV7mmcj3SuyrxAr8VNf2TYTLm9i72LWYFoUHiU5qUtJxgscSz2Lnq%2Fu%2BpeGT5FeNnhTPOD9E3W4h7z1hx59PXuo383GZyRwQsTGQhmyVu7YiTdy%2BVTz4mYUTIyFb7WUE%2F1bBJaVC%2B420RzIkcx1FlwsxUKKJUSNn1%2BMbqYYkBHC8amr7noBhi2QmGySf90Fzw11aSCdI31L8HxOhO3NIXsx0C7gnJsmlrt5zLZaH4QPbXAo4GXfaWfyjr%2Fg%2BwAVZOOTyL6MpQTcWzONvv4d9NgLpl62UoCZyzIRCq5he%2Fedw%2BbKCvmn2aIGkv8dL%2FJ0Snp1W4hWqt8SZBX8hcXLwq%2FmQSTJpM7iFiqwRNgqN7gPNKk%2FaljEoxgNmwsthB%2BL3Sb2SZeevdkqONyT81EwH5vyC7NMHRjBzOoH%2BARUs09FRGN02oefg0BF%2FylKuHyfosVwfrFYuAWxVR8ws1am9kmdm9LW6UhurMwI5cIHk9KZnZRW%2B313Ux9HP9QTCU%2BpXNBjqdATOcdhgp%2BbO8zMXyXrgp4j7AWOk7QVsmKJbve80jrXo2WGKhoRctgbtxAsI39xSFBAsgK9UzkcAT2si9QxOREZ4iriW5sRQUseE72eoYXUJpNpO6tyJr8I4q%2FlIuZXbzrsw3lR9uHlcmHs1bQ1DVRrQG2gYmO4g5Wqv326dfhs%2BRGKiBL331g136gjfeTehCpP2T3Y%2Fh1WLTLASS4IE%3D&X-Amz-Signature=7410a55ec81216aec6aafcb51ca8b223ebf19ecf663ae7920537af0196f6007e&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
```

</details>


---

<sub>⏱️ 25s</sub>

### ✅ `dx-pagopa_query_documentation`

**Terraform required tags CostCenter BusinessUnit ManagementTeam**

<details>
<summary>Arguments</summary>

```json
{
  "query": "Terraform required tags CostCenter BusinessUnit ManagementTeam",
  "number_of_results": 5
}
```

</details>

<details>
<summary>113 lines</summary>

````
Result 1 (Score: 0.9618):
# Required Resource Tags
> All Azure resources created with Terraform must include a standard set of tags.
These tags are essential for cost tracking, ownership identification, and
resource management.
# Required Resource Tags
All Azure resources created with Terraform must include a standard set of tags.
These tags are essential for cost tracking, ownership identification, and
resource management.
## Required Tags
| Tag | Description | Example Values |
| - | - | - |
| `CostCenter` | Budget tracking identifier | `"TS000 - Tecnologia e Servizi"` for IO |
| `CreatedBy` | How the resource was created | Always `"Terraform"` |
| `Environment` | Deployment environment | `"Prod"`, `"Dev"`, `"Uat"` |
| `BusinessUnit` | Product or business unit | `"App IO"`, `"CGN"`, `"Carta della Cultura"`, `"IT Wallet"`, `"DevEx"` |
| `Source` | Link to the Terraform source code | `"https://github.com/pagopa/<repo>/blob/main/infra/resources/<env>"` |
| `ManagementTeam` | Team responsible for the resource management | `"IO Platform"`, `"IO Wallet"`, `"IO Comunicazione"`, `"Developer Experience"`, etc. |
## Implementation
Define tags in `locals.tf` and apply them to all resources:
```hcl title="locals.tf"
locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    Source         = "https://github.com/pagopa/io-infra/blob/main/infra/resources/prod"
    ManagementTeam = "IO Platform"
  }
}
```
```hcl title="main.tf"
resource "azurerm_resource_group" "example" {
  name     = "example-rg"
  location = "italynorth"
  tags = local.tags
}
```
:::tip Consistent Tagging
Always pass `local.tags` to resources and modules. Never hardcode tags directly
in resources.
:::
## Business Units
Common business unit values used at PagoPA:
| BusinessUnit | Description |
| - | - |
| `App IO` | IO mobile application |
| `CGN` | Carta Giovani Nazionale |
| `Carta della Cultura` | Cultural card initiative |
| `IT Wallet` | Digital wallet initiative |
| `DevEx` | Developer Experience team |
## Management Teams
Common management team values for the IO product:
| ManagementTeam | Area |
| - | - |
| `IO Platform` | Platform infrastructure |
| `IO Wallet` | Wallet features |
| `IO Comunicazione` | Communication features |
| `IO Enti & Servizi` | Services integration |
| `IO Autenticazione` | Authentication |
| `IO Bonus & Pagamenti` | Bonus and payments |
| `IO Firma` | Digital signature |
| `Developer Experience` | DevEx team |
## Environment Values
The `Environment` tag should match the deployment folder:
| Folder | Environment Tag |
| - | - |
| `dev/` | `"Dev"` |
| `uat/` | `"Uat"` |
| `prod/` | `"Prod"` |
## Source Tag Format
The `Source` tag must point to the exact location of the Terraform code in the
GitHub repository:
```text
https://github.com/pagopa/<repository>/blob/main/infra/resources/<environment>
```
:::info Examples
- `https://github.com/pagopa/io-infra/blob/main/infra/resources/prod`
- `https://github.com/pagopa/cgn-onboarding-portal/blob/main/infra/resources/dev`
:::

Location: https://dx.pagopa.it/docs/terraform/required-tags
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/terraform/required-tags.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPQAQEJZVP%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJIMEYCIQCEjOkeZujsa76mz3HV5gI1mXZjfxcG1weBNIQKOWjRSAIhAPrVXxFw5brQBZQnr2jfPQoHopaYU92plOLI7nUuj01CKp0DCIX%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMjI1OTAzMTAzNTgzIgyWHqyWnxfEsBbMb1sq8QIsxlG7hklScOy5TmU3c%2FQYzyzaVFaX%2BVg5xjQYnVqNwdpExYEKJtl3Q1S6Ux6XsvM1Q%2FvULw6px43HWsAAjKxnyV1yWuJcjQ%2F%2BGaqvr2jmu2GIOkxKL2VTAOzoAH2NU5r2RcdsGI7uieMmR2EYxr0NnuPz0jmiPtUDAfJHHLuIV9QYB7CxXsFVmXpFW6GAwd3jf9L5E3PuMirY%2FY0PMuSpk5MAZmIn1tUCIG%2FL7w2AqEuLLfGDOCO1WrE%2Fjpf4Ex8dkOdywl4MQoTWelqSkgqzojVWx0B8uTziR2D%2FIZIuDfmXyBqY%2FfS7rlbvE3G0FGFZrgiZUUvywRhB%2FckyL%2BJ52rWoU70pmLF2qL2a3QgK66Z382U4MRxB6MdZvYa6KjjBllVHy%2BA5v4nhfFY3rVYHyv8A7aqHQIJdtgV%2FFkEbpFq4Fz82%2FkqCH1jqd1aqMYaemIoUGPYd2ZUppTtgQrREJrWVWV7WIyPkTtZyz7v9nVMwlPqVzQY6nAFoXaCxfJWUGjGQwB0ZBhVFy0PYdB6OTkFCO0uX7vAqG3IQUTfOXlQprD9sTvI9WSnvQM8qS2IHLa7B9dPKl%2FJpfqq4IbAa%2BGVzEue0CMiF%2BUeG2rK1pkGfCecrcU2RMF%2BQvSfn60UYaWCoioq5fZP3DSxbb2aCJCjn9OKppsj0DcazZUJ4YKkTghAKZ5zU1CvROWnOBB3mu7fwO50%3D&X-Amz-Signature=d431300fce99591df9d350c4399e6c855aba7703a647d7c517eb1d8cb65f1bda&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject


Result 2 (Score: 0.7596):
# Specific TAGs
> This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.
# Specific TAGs
This policy rule ensures that all Azure resources comply with a predefined set
of tagging rules.
## Policy Rules
This policy enforces the following conditions:
- The `CostCenter` tag must match the allowed user-defined value.
- The `CreatedBy` tag must be either one of: `Terraform` or `ARM`.
- The `Environment` tag must be one between: `Prod`, `Dev`, or `Uat`.
- The `BusinessUnit` tag must be in the user-defined list of allowed values.
- If `CreatedBy` is `Terraform`, the `Source` tag must match a specific URL to
  the Terraform workspace in the codebase
- The `ManagementTeam` tag must be in the user-defined list of allowed values.
If any of these conditions are not met, resource creation is denied. The full
policy definition can be found in
[specific_tags_rule_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_rule_v1.json).
## Parameters
The policy allows customization through the following parameters, defined in
[specific_tags_parameters_v1.json](https://github.com/pagopa/dx/blob/main/infra/policy/_policy_rules/specific_tags_parameters_v1.json):
| Parameter | Type | Description |
| - | - | - |
| `CostCenter` | String | Allowed CostCenter value. |
| `BusinessUnit` | Array | Allowed Business Units. |
| `ManagementTeam` | Array | Allowed Management Teams. |
| `SourceOrg` | String | Allowed GitHub organization for source tagging. |

Location: https://dx.pagopa.it/docs/azure/policies/policy-catalog/specific-tags
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/azure/policies/policy-catalog/specific-tags.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPQAQEJZVP%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJIMEYCIQCEjOkeZujsa76mz3HV5gI1mXZjfxcG1weBNIQKOWjRSAIhAPrVXxFw5brQBZQnr2jfPQoHopaYU92plOLI7nUuj01CKp0DCIX%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMjI1OTAzMTAzNTgzIgyWHqyWnxfEsBbMb1sq8QIsxlG7hklScOy5TmU3c%2FQYzyzaVFaX%2BVg5xjQYnVqNwdpExYEKJtl3Q1S6Ux6XsvM1Q%2FvULw6px43HWsAAjKxnyV1yWuJcjQ%2F%2BGaqvr2jmu2GIOkxKL2VTAOzoAH2NU5r2RcdsGI7uieMmR2EYxr0NnuPz0jmiPtUDAfJHHLuIV9QYB7CxXsFVmXpFW6GAwd3jf9L5E3PuMirY%2FY0PMuSpk5MAZmIn1tUCIG%2FL7w2AqEuLLfGDOCO1WrE%2Fjpf4Ex8dkOdywl4MQoTWelqSkgqzojVWx0B8uTziR2D%2FIZIuDfmXyBqY%2FfS7rlbvE3G0FGFZrgiZUUvywRhB%2FckyL%2BJ52rWoU70pmLF2qL2a3QgK66Z382U4MRxB6MdZvYa6KjjBllVHy%2BA5v4nhfFY3rVYHyv8A7aqHQIJdtgV%2FFkEbpFq4Fz82%2FkqCH1jqd1aqMYaemIoUGPYd2ZUppTtgQrREJrWVWV7WIyPkTtZyz7v9nVMwlPqVzQY6nAFoXaCxfJWUGjGQwB0ZBhVFy0PYdB6OTkFCO0uX7vAqG3IQUTfOXlQprD9sTvI9WSnvQM8qS2IHLa7B9dPKl%2FJpfqq4IbAa%2BGVzEue0CMiF%2BUeG2rK1pkGfCecrcU2RMF%2BQvSfn60UYaWCoioq5fZP3DSxbb2aCJCjn9OKppsj0DcazZUJ4YKkTghAKZ5zU1CvROWnOBB3mu7fwO50%3D&X-Amz-Signature=d8df0a24aaddcf2b312b9575d262a3e94f604870a8c3b5aaafb2cf502148cf54&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
````

</details>


---

<sub>⏱️ 25s</sub>

### ✅ `dx-pagopa_query_documentation`

**DX Terraform modules pagopa-dx Function App Storage Cosmos**

<details>
<summary>Arguments</summary>

```json
{
  "query": "DX Terraform modules pagopa-dx Function App Storage Cosmos",
  "number_of_results": 5
}
```

</details>

<details>
<summary>7 lines</summary>

```
Result 1 (Score: 0.5414):
# Working with Terraform > This section offers comprehensive guidance on infrastructure-related topics, common problem resolutions, patterns, and best practices for building scalable applications on Azure. # Working with Terraform This section offers comprehensive guidance on infrastructure-related topics, common problem resolutions, patterns, and best practices for building scalable applications on Azure. ## Infrastructure for Application Developers As a software engineer, you'll need to deploy infrastructure for your applications. Start here: 1. **[Learn about our Terraform modules](./using-terraform-registry-modules.md)** - Use our production-ready modules 2. **[Deploy Azure resources](../azure/index.md)** - Deploy secure, scalable infrastructure for your applications 3. **[Automate deployments](./infra-apply.md)** - Set up CI/CD for infrastructure ## Available Tools ### 🏗️ Terraform Modules Production-ready modules available on the [Terraform Registry](https://registry.terraform.io/namespaces/pagopa-dx): - **[Azure Core Infrastructure](https://registry.terraform.io/modules/pagopa-dx/azure-core-infra)** - Foundational networking, security, and monitoring - **[Container App Environment](https://registry.terraform.io/modules/pagopa-dx/azure-container-app-environment)** - Scalable containerized applications - **[Role Assignments](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments)** - Secure identity and access management [**Browse all modules →**](https://registry.terraform.io/namespaces/pagopa-dx) ### 🔧 DX Provider Custom Terraform provider for Azure resources: - Simplified configuration for common patterns - Built-in security best practices - Integration with DX conventions [**Learn about the DX provider →**](../contributing/contributing-to-dx-provider.md) ### 📋 Best Practices - **[IaC Folder structure](./infra-folder-structure.md)** - Organize Infrastructure as Code - **[Code style](./code-style.md)** - File organization, variables, outputs, and formatting conventions - **[Required tags](./required-tags.md)** - Mandatory tags for all Azure resources - **[Pre-commit hooks](./pre-commit-terraform.md)** - Validate and format Terraform code - **[Azure naming conventions](../azure/azure-naming-convention.md)** - Consistent resource naming - **[Secrets management](../azure/application-deployment/appservice-hidden-appsettings.md)** - Use Key Vault references in AppSettings ## Azure Resources Guide ### Most Common Use Cases - **[Setting up static web apps](../azure/static-websites/build-deploy-static-web-app.md)** - Deploy static sites with CI/CD - **[IAM and security](../azure/iam/azure-iam.md)** - Manage permissions and access control - **[API Management](../azure/apim/index.md)** - Configure and secure APIs - **[Monitoring and tracing](../azure/monitoring/azure-tracing.md)** - Observability and debugging [**View all Azure guides →**](../azure/index.md) ## Contributing Help improve DX infrastructure tools: - **[Contributing to Terraform modules](../contributing/contributing-to-dx-terraform-modules.md)** - Add new modules or improve existing ones - **[Module documentation](../contributing/documenting-dx-terraform-modules.md)** - Keep docs up to date - **[Testing and validation](./pre-commit-terraform.md)** - Ensure quality and consistency :::tip **Infrastructure as Code Best Practices** Follow our [Infrastructure as Code guidelines](./infra-folder-structure.md) to ensure consistency across projects and teams. For issues or feature requests, visit our [support page](../support.md). :::
Location: https://dx.pagopa.it/docs/terraform/
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/terraform/index.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPVZM3BOEJ%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121143Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJIMEYCIQDV07mtbFDW26kzqmRyGm5U11wzWsVMo1E%2BNGps8alECQIhAPLDn0%2FmqP3HExId92eCXjgPw4Muh0f6ZULMNJnTT6nGKp0DCIX%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMjI1OTAzMTAzNTgzIgyFKqhE5AORXD%2Bdn7oq8QIQ%2BP273ctIwRGJhPvnw71S44%2Bl6ko0wmq0DH7En0liiXiqWt0G9cgieb0q19WaM8jiYt9gMRyWvzAGvLRMghB3S7OEd%2Biokn2VB7RVA9P0Bs0I0xWc1h3g47XRhdHpFXktndmnvqZwnzVSx%2BaLdHDYZ3zhAIXp3phKFi1LBW0rMDrOge9FmLlL7kgA3mv2yPOMRAfJ%2Bn6v1quGy6j8P16lwBH6bOYcUeT%2FHZvRYrN6OtI%2FavHrdSn2q3B7GBMZvwGQtmqG9DX4eURZ66%2FuSuPKiLdgdMWFnnLDyVeP8bmDcd13%2FoLrjmAhD5vApycmve9cwoIeqgYAm0VgKRGLvNQu4Dhu85K0YdZZxXWa96LDR4H4vJhAHShXinmZqQHJ1eyljG1N9EJLqzriaTtsYhVXPwLjjp4T1qtpW%2F3yIR0FsJAYwZhKp9hD%2BNkgT8mQ5VdF98xH3V2mhz9Uqv7BLIXENmQersNUi3t9fRzUwI6qoWEw6PmVzQY6nAHS%2Bf26tjFEnkNLccUUHdxQLsXwZlpdzlLrHCslbVO5Qm%2BXbBnmTExfIjhzGs47jKNMCTVyyXd1pK0%2F%2BTFpfjWFfsInoQ1cpcyLI6LqzGJCbrBQHjCQ96rVzvXDOQHGy96Wkovu8qPM1NxminWo%2Bbgtg1S4vhljcQQXGt5l7yZNZYj5bUFTo4IQCHl5FUi1BmI70dOr4QAtz0Fwetw%3D&X-Amz-Signature=caa813e27af6af178660e02995a8367e8fb16bb1b12e1df1f3bc92d43586aec5&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
<output too long - dropped 201 lines from the middle>
Location: https://dx.pagopa.it/docs/
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/index.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPVZM3BOEJ%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121143Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJIMEYCIQDV07mtbFDW26kzqmRyGm5U11wzWsVMo1E%2BNGps8alECQIhAPLDn0%2FmqP3HExId92eCXjgPw4Muh0f6ZULMNJnTT6nGKp0DCIX%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMjI1OTAzMTAzNTgzIgyFKqhE5AORXD%2Bdn7oq8QIQ%2BP273ctIwRGJhPvnw71S44%2Bl6ko0wmq0DH7En0liiXiqWt0G9cgieb0q19WaM8jiYt9gMRyWvzAGvLRMghB3S7OEd%2Biokn2VB7RVA9P0Bs0I0xWc1h3g47XRhdHpFXktndmnvqZwnzVSx%2BaLdHDYZ3zhAIXp3phKFi1LBW0rMDrOge9FmLlL7kgA3mv2yPOMRAfJ%2Bn6v1quGy6j8P16lwBH6bOYcUeT%2FHZvRYrN6OtI%2FavHrdSn2q3B7GBMZvwGQtmqG9DX4eURZ66%2FuSuPKiLdgdMWFnnLDyVeP8bmDcd13%2FoLrjmAhD5vApycmve9cwoIeqgYAm0VgKRGLvNQu4Dhu85K0YdZZxXWa96LDR4H4vJhAHShXinmZqQHJ1eyljG1N9EJLqzriaTtsYhVXPwLjjp4T1qtpW%2F3yIR0FsJAYwZhKp9hD%2BNkgT8mQ5VdF98xH3V2mhz9Uqv7BLIXENmQersNUi3t9fRzUwI6qoWEw6PmVzQY6nAHS%2Bf26tjFEnkNLccUUHdxQLsXwZlpdzlLrHCslbVO5Qm%2BXbBnmTExfIjhzGs47jKNMCTVyyXd1pK0%2F%2BTFpfjWFfsInoQ1cpcyLI6LqzGJCbrBQHjCQ96rVzvXDOQHGy96Wkovu8qPM1NxminWo%2Bbgtg1S4vhljcQQXGt5l7yZNZYj5bUFTo4IQCHl5FUi1BmI70dOr4QAtz0Fwetw%3D&X-Amz-Signature=9999862f67a997eb0a19f14e076327117a266ff19ee37a24df4ba538cba43d7b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
```

</details>


---

<sub>⏱️ 25s</sub>

### ✅ `dx-pagopa_query_documentation`

**Key Vault references AppSettings secrets**

<details>
<summary>Arguments</summary>

```json
{
  "query": "Key Vault references AppSettings secrets",
  "number_of_results": 5
}
```

</details>

<details>
<summary>10 lines</summary>

````
Result 1 (Score: 0.8179):
# Using Secrets in AppService Environment Variables > Using secret values in AppService (or FunctionApp) is a common challenge for developers. Terraform is often used to set secrets exported by other resources such as Storage Accounts, but this approach is not convenient as involves lot of downsides. In fact, anyone is able to read AppSettings, sensitive values are stored in plain text in Terraform state file and the secret rotation must be executed manually through Terraform. # Using Secrets in AppService Environment Variables ## Overview Using secret values in AppService (or FunctionApp) is a common challenge for developers. Terraform is often used to set secrets exported by other resources such as Storage Accounts, but this approach is not convenient as involves lot of downsides. In fact, anyone is able to read AppSettings, sensitive values are stored in plain text in Terraform state file and the secret rotation must be executed manually through Terraform. This guide aims to instruct developers with best practices, providing guidelines for a better secrets management including the following benefits: - Updating a value in KeyVault does not require a Terraform Apply anymore: through the Azure Portal it is possible to force new values pulling from KeyVault - If a secret reference is broken (e.g. missing secret, lack of read permissions, etc.), Azure Portal highlights it in red - It becomes easier to track where secrets have been used ## How-To use Key Vault References as AppSettings To use secrets from KeyVault as AppSettings values, you can follow these steps: 1. Granting the AppService's system-assigned managed identity access to read secrets: - For KeyVaults using Access Policies, assign `Get` and `List` permissions. - For KeyVaults using RBAC, assign the `Key Vault Secrets User` role. 2. By referencing the secrets from the AppService environment variables, using one between: - `@Microsoft.KeyVault(VaultName=<kv-name>;SecretName=<secret-name>)` - `@Microsoft.KeyVault(SecretUri=https://<kv-name>.vault.azure.net/secrets/<secret-name>)` :::warning Despite it is possible to refer a specific secret **version**, the practice is discouraged as it requires a manual secret rotation. More information is available in the [official KeyVault documentation](https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation#key-rotation-policy). ::: ### Techniques to Facilitate the Code Refactoring The shared approach requires some code refactoring. We recommend to encapsulate the logic in the submodule of your AppService/Functions Apps in something like: ```hcl locals { local.function_apps.common_app_settings, { for s in var.app_settings : s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${s.key_vault_secret_name})" : s.value } } variable "app_settings" { type = list(object({ name                  = string value                 = optional(string, "") key_vault_secret_name = optional(string) })) description = "AppSettings configuration" } ``` Then, the caller root module could use this code: ```hcl app_settings = [ { name                  = "secret1" key_vault_secret_name = "secret1" }, { name                  = "secret2" key_vault_secret_name = "secret2" }, { name  = "plan1" value = "plain value" }, ] ``` ### Managing Sensitive Resource Outputs In some scenarios, the output of a Terraform module may include sensitive values, leading to the issue described above. To address this, you should save the output value into KeyVault and reference it using the previously illustrated syntax. To save a secret in the KeyVault: ```hcl resource "azurerm_key_vault_secret" "example" { name         = "secret-sauce" value        = "szechuan" key_vault_id = azurerm_key_vault.example.id tags = local.tags } ``` This code requires either the `Set` policy assignment or the `Key Vault Secrets Officer` role. More info can be found in the [official KeyVault documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret).
Location: https://dx.pagopa.it/docs/azure/application-deployment/appservice-hidden-appsettings
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/azure/application-deployment/appservice-hidden-appsettings.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZP5ALETSTF%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJGMEQCIAScSAwe%2F%2FjdXZBohagPU32XluWvVle1BTK7qHs7s%2BFrAiAKONeMxCPKArL5EwnAGs4Lq3PHqnG9zWm0MyzC3MrFOCqdAwiF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIyNTkwMzEwMzU4MyIMabvb7j39E2oo3eHmKvEC1sxg8ob9z6kujMiTwwexx0Cf5aYmiYl95%2B05TCi1zg2tSzmjYs11%2FW2LiX7e8NlLDVNS5DCC8etBSTRByHn%2FLytt8aFwrTjbc0G2SuzFxX0MKuGB%2BTFLrnvoLFsFvOry%2BZUeDvpL0MSKQxxSSjnI2Qv5QWuo3wAMY%2BvJOIFshOTFj0Dn0PrageiRhdmF1bdNQCX6e2D%2B0%2BJLrEf8NKaGl6MYVpi7gJXQolDuKTa8benFnwRUANZA5xa3Yi6ohCHNDv7JUaa76NlRnJ7At3HoJSwT6377drsijfOEj1C92gGn6XwgdleRa7hp13jAKQPcd5MwfXawfq1m67Z9EssfpRiDoSD2q6isye%2BtNwnIeFThQmX64kGreXlk%2FhrGqCsxt7Pll%2FAWq3hKAoS%2FE6nG9F22I3rYoNRj%2BqeqZx%2FIVNVZRuABrpLX7KuPPuQW6Ykzyio%2BzpaG4tAcWThEe7gDR9cdrZ7GV90AeMXCoRbSZyy9MJT6lc0GOp4B%2BCJ7wtDOh4zxPk5Nvqs%2FWN1UcUmSq33XXHxEk8p6Gmwkkmeky5rHSBSGIQDklyOFrZTo%2BCgosFr06DAvIGzzNTCPlYHPFq3V%2FoSTNlPdsIAJxiIlUqkcTxT58QwedQOP95hlPMmsvfOMmtvXTw90ZwJn9vryvxzzE2GdmkdNaYEFrzz7Ty%2Bmwevq9s5tqtJ3Rj%2BYINufBM2H2Kmoe1g%3D&X-Amz-Signature=4f4ad2ec92626ac83631845c3f0669678931e6032561f3ef6024b0730dae2cd8&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject


Result 2 (Score: 0.5599):
<output too long - dropped 3 lines from the middle>


Result 3 (Score: 0.2935):
# Managing AppSettings and Secrets With Azure > This documentation provides guidance on managing application settings and secrets efficiently using Azure services. It includes best practices for secure storage, retrieval, and management of sensitive configuration data in your applications. # Managing AppSettings and Secrets With Azure This documentation provides guidance on managing application settings and secrets efficiently using Azure services. It includes best practices for secure storage, retrieval, and management of sensitive configuration data in your applications. ## Key Concepts Azure AppConfiguration can manage appsettings, secrets and feature flags. These can be imported via a JSON file, that can be defined next to the application code, and deployed to the AppConfiguration instance via the same GitHub Action used by the application. The application needs to use the methods provided by the official Azure App Configuration SDK (e.g., for [Node.js](https://learn.microsoft.com/en-us/azure/azure-app-configuration/quickstart-javascript-provider?tabs=entra-id) or [`Java`](https://learn.microsoft.com/en-us/azure/azure-app-configuration/quickstart-java-spring-app)) to fetch settings, secrets and feature flags at runtime. SDKs support **hot reload of settings**, so that changes in the AppConfiguration instance are reflected in the application without requiring a restart/deploy. Feature flags offer flexibility in dynamically enabling or disabling features without redeploying the application, using built-in or custom rules. Applications can also access secrets stored in **KeyVault** through AppConfiguration, simplifying the management of sensitive data. Moreover, it removes the need to set environment variables via Terraform, which slows down development and deployment, rather than storing sensitive configuration data directly in the Terraform state file. A collection of code samples is available [on GitHub](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/appconfiguration/app-configuration/samples/v1/typescript/src). ## Key Topics - **[Setting up Azure AppConfiguration and KeyVault](./azure-app-configuration.md)**: Detailed instructions on how to set up and use Azure AppConfiguration service for managing application settings and secrets. - **[Defining Application Settings, Secrets and Feature Flags](./appsettings-definition.md)**: Guide on how to define and organize application settings, secrets, and feature flags within Azure AppConfiguration and KeyVault. - **[Updating GitHub Actions to deploy settings and secrets within the application](./appsettings-deploy.md)**: Guide on deploying application settings and secrets to Azure App Configuration instance.
Location: https://dx.pagopa.it/docs/azure/app-configuration/
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/azure/app-configuration/index.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZP5ALETSTF%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJGMEQCIAScSAwe%2F%2FjdXZBohagPU32XluWvVle1BTK7qHs7s%2BFrAiAKONeMxCPKArL5EwnAGs4Lq3PHqnG9zWm0MyzC3MrFOCqdAwiF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIyNTkwMzEwMzU4MyIMabvb7j39E2oo3eHmKvEC1sxg8ob9z6kujMiTwwexx0Cf5aYmiYl95%2B05TCi1zg2tSzmjYs11%2FW2LiX7e8NlLDVNS5DCC8etBSTRByHn%2FLytt8aFwrTjbc0G2SuzFxX0MKuGB%2BTFLrnvoLFsFvOry%2BZUeDvpL0MSKQxxSSjnI2Qv5QWuo3wAMY%2BvJOIFshOTFj0Dn0PrageiRhdmF1bdNQCX6e2D%2B0%2BJLrEf8NKaGl6MYVpi7gJXQolDuKTa8benFnwRUANZA5xa3Yi6ohCHNDv7JUaa76NlRnJ7At3HoJSwT6377drsijfOEj1C92gGn6XwgdleRa7hp13jAKQPcd5MwfXawfq1m67Z9EssfpRiDoSD2q6isye%2BtNwnIeFThQmX64kGreXlk%2FhrGqCsxt7Pll%2FAWq3hKAoS%2FE6nG9F22I3rYoNRj%2BqeqZx%2FIVNVZRuABrpLX7KuPPuQW6Ykzyio%2BzpaG4tAcWThEe7gDR9cdrZ7GV90AeMXCoRbSZyy9MJT6lc0GOp4B%2BCJ7wtDOh4zxPk5Nvqs%2FWN1UcUmSq33XXHxEk8p6Gmwkkmeky5rHSBSGIQDklyOFrZTo%2BCgosFr06DAvIGzzNTCPlYHPFq3V%2FoSTNlPdsIAJxiIlUqkcTxT58QwedQOP95hlPMmsvfOMmtvXTw90ZwJn9vryvxzzE2GdmkdNaYEFrzz7Ty%2Bmwevq9s5tqtJ3Rj%2BYINufBM2H2Kmoe1g%3D&X-Amz-Signature=1c30a12178bda0dbaa2efb9e6f754d1a56f4dacf279c31cd36eca1d6ea2c1bab&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
````

</details>


---

<sub>⏱️ 25s</sub>

### ✅ `dx-pagopa_query_documentation`

**dx_available_subnet_cidr networking subnet**

<details>
<summary>Arguments</summary>

```json
{
  "query": "dx_available_subnet_cidr networking subnet",
  "number_of_results": 5
}
```

</details>

<details>
<summary>17 lines</summary>

```
Result 1 (Score: 0.9929):
# Using DX Azure Terraform Provider
> The DX Azure Terraform provider simplifies the creation and management of Azure
resources by enforcing standardized naming conventions and configurations. This
provider is maintained by the [PagoPA organization](https://github.com/pagopa)
and is available in the Terraform Registry under the namespace
[pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx).
# Using DX Azure Terraform Provider
The DX Azure Terraform provider simplifies the creation and management of Azure
resources by enforcing standardized naming conventions and configurations. This
<output too long - dropped 177 lines from the middle>
Location: https://dx.pagopa.it/docs/terraform/code-style
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/terraform/code-style.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPQYQ2Y3TB%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJGMEQCIF00qC%2Bs3fjFKFVZLLjIVpdy%2BR9RKjXsZ5KuvrHfH%2BleAiBdTeAJf9GQGjIz7x3uj9BC9LW8Osze0zIcw5CcCpXMzSqdAwiF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIyNTkwMzEwMzU4MyIM0LFOJPTvYPrNaYVNKvECmjbyjQIB8mewAs5wcPXCXPhLPNVp4i9T2oydRT2FGCdx8bLw0uSIzhRXKzdBOlChQaXPu716LxJwtjPbUbTXcp7N9hzT7%2BaYecscAsH6H8eNrxl1fmLkeO6knPhTz3UZ3gvEtNbs1mC8ZvtHYLoEm0sQ8eEeOpAMeloySWIVMDlwZM%2BKsHCVj99%2FveUMZ8Z6HwLaAMa4mDRa4vCMPxphJoYzBvh82WUPMftzxz2EgrFExGTLSeT4N91vav0mKqxxdHdDMnXfHCU4dD42%2Fk9d1moDI7RhLW6CKjcCBuw8i8lPAz0%2Bp%2Fbt2hN4drNiZnLS9ZNoVlNnqHTQFfUVDoArBrB%2BJ6U4WkI%2BWWeJkMp4m9VUD7qy%2BhBc6bwvvhyxMooiq9kDq5IE6mqZZb%2BIZEouco%2FT8Og7eFPIozdnJfERhvZgzT8EXzyV169RhajXffvkybhS%2Brgp4vTCrb2ieABRIhIIjRA6PHOPxbsg%2B5KaS3FeMJT6lc0GOp4Bkq9JS7eEbYfj5mHcealZe1kqOiFXMkFPrRGToGrP5TyKxDXqZWyZN97ZB%2FkQLJTGvSqi1ti0RLNnH0SJI32lXuVzjfd2nB4tyFg2AGg0SKTvRh8DMGHsbdIW2114DzCZm6dM6qJvzXAOjP%2F09FQChkoqoAm8i8vw%2FtuNalYKPHLvPWt7h9vHNqty4gah9EkEyQlOGWYWUB%2F3BK0GjUQ%3D&X-Amz-Signature=e36ef8877b0a2ff345298987cfc1ac89fb5500a9bf25c65f48eb094c00980eb8&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject


Result 3 (Score: 0.0001):
# Getting Support > The [DX team](https://github.com/orgs/pagopa/teams/engineering-team-devex) is here to help you with any questions, issues, or feature requests related to the DX platform. # Getting Support The [DX team](https://github.com/orgs/pagopa/teams/engineering-team-devex) is here to help you with any questions, issues, or feature requests related to the DX platform. ## How to Get Help ### GitHub Issues For bug reports, feature requests, and technical questions: - **📝 Open a [GitHub issue](https://github.com/pagopa/dx/issues)** - Use our issue templates for faster resolution - **🐛 Report bugs** - Include specific error messages, logs, and reproduction steps - **💡 Feature requests** - We're always looking for ways to improve DX - **❓ Ask questions** - About modules, pipelines, workflows, or any DX component ### Slack Channel For direct support and real-time assistance: - **💬 Join the `#team_devex_help` channel** - Available for teams adopting DX golden paths - **📋 Share context** - Provide error messages, pipeline logs, or configuration details - **🤝 Collaborate** - Get help from both the DX team and the community ## What to Include When Asking for Help To help us assist you quickly, please provide: - **Error messages or logs** - Include specific error text and stack traces - **Repository structure** - Share relevant file organization details - **Terraform/configuration paths** - Show your setup and configuration files - **Steps to reproduce** - Describe what you were doing when the issue occurred - **Environment details** - Include versions, platforms, and tools being used ## Stay Connected **📖 [Read our blog](https://dx.pagopa.it/blog)** - Get the latest updates and feature announcements **⭐ [Watch our repository](https://github.com/pagopa/dx)** - Stay informed about new releases **🔔 [Subscribe to notifications](https://github.com/pagopa/dx/subscription)** - Get alerts for important updates ## Contributing We welcome contributions! If you'd like to contribute to DX: - Check our [contributing guidelines](./contributing/index.md) - Review open issues marked as "good first issue" - Submit pull requests with improvements or bug fixes ## Support Scope The DX team provides support for: - ✅ **Infrastructure as Code** - Terraform modules, providers and best practices - ✅ **CI/CD Pipelines** - GitHub Actions workflows and automation - ✅ **Development Tools** - Pre-commit hooks, linters, and formatters - ✅ **Collaboration Practices** - Git workflows and pull request guidelines - ✅ **Documentation** - All DX-related documentation and guides --- Remember, the DX platform is designed to simplify and standardize your development workflow. Don't hesitate to reach out for help as you adopt DX golden paths!
Location: https://dx.pagopa.it/docs/support
Source File: https://dx-p-euc1-docs-kb-s3-01.s3.eu-central-1.amazonaws.com/support.md?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIATJGG7ZZPQYQ2Y3TB%2F20260302%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260302T121144Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjELz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDGV1LWNlbnRyYWwtMSJGMEQCIF00qC%2Bs3fjFKFVZLLjIVpdy%2BR9RKjXsZ5KuvrHfH%2BleAiBdTeAJf9GQGjIz7x3uj9BC9LW8Osze0zIcw5CcCpXMzSqdAwiF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIyNTkwMzEwMzU4MyIM0LFOJPTvYPrNaYVNKvECmjbyjQIB8mewAs5wcPXCXPhLPNVp4i9T2oydRT2FGCdx8bLw0uSIzhRXKzdBOlChQaXPu716LxJwtjPbUbTXcp7N9hzT7%2BaYecscAsH6H8eNrxl1fmLkeO6knPhTz3UZ3gvEtNbs1mC8ZvtHYLoEm0sQ8eEeOpAMeloySWIVMDlwZM%2BKsHCVj99%2FveUMZ8Z6HwLaAMa4mDRa4vCMPxphJoYzBvh82WUPMftzxz2EgrFExGTLSeT4N91vav0mKqxxdHdDMnXfHCU4dD42%2Fk9d1moDI7RhLW6CKjcCBuw8i8lPAz0%2Bp%2Fbt2hN4drNiZnLS9ZNoVlNnqHTQFfUVDoArBrB%2BJ6U4WkI%2BWWeJkMp4m9VUD7qy%2BhBc6bwvvhyxMooiq9kDq5IE6mqZZb%2BIZEouco%2FT8Og7eFPIozdnJfERhvZgzT8EXzyV169RhajXffvkybhS%2Brgp4vTCrb2ieABRIhIIjRA6PHOPxbsg%2B5KaS3FeMJT6lc0GOp4Bkq9JS7eEbYfj5mHcealZe1kqOiFXMkFPrRGToGrP5TyKxDXqZWyZN97ZB%2FkQLJTGvSqi1ti0RLNnH0SJI32lXuVzjfd2nB4tyFg2AGg0SKTvRh8DMGHsbdIW2114DzCZm6dM6qJvzXAOjP%2F09FQChkoqoAm8i8vw%2FtuNalYKPHLvPWt7h9vHNqty4gah9EkEyQlOGWYWUB%2F3BK0GjUQ%3D&X-Amz-Signature=b8a5f9671a18abce2fd6a4182bd71664ab94b306f63f8080b0c0795c65dae79f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
```

</details>


---

<sub>⏱️ 31s</sub>

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


---

<sub>⏱️ 31s</sub>

### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure-function-app"
}
```

</details>

<details>
<summary>16 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure-function-app

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
```

</details>


---

<sub>⏱️ 31s</sub>

### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure-storage-account"
}
```

</details>

<details>
<summary>16 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure-storage-account

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


---

<sub>⏱️ 31s</sub>

### ✅ `terraform-search_modules`

<details>
<summary>Arguments</summary>

```json
{
  "module_query": "pagopa-dx azure-cosmos-account"
}
```

</details>

<details>
<summary>16 lines</summary>

```
Available Terraform Modules (top matches) for pagopa-dx azure-cosmos-account

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


---

<sub>⏱️ 36s</sub>

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


---

<sub>⏱️ 36s</sub>

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


---

<sub>⏱️ 36s</sub>

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


---

<sub>⏱️ 36s</sub>

### ✅ `terraform-get_provider_capabilities`

<details>
<summary>Arguments</summary>

```json
{
  "name": "azure",
  "namespace": "pagopa-dx"
}
```

</details>

<details>
<summary>7 lines</summary>

```
Provider Capabilities: pagopa-dx/azure (v0.8.3)

Functions: 1 available
  - resource_name (provider_doc_id: 11349628)

Overview: 1 available
  - overview (provider_doc_id: 11349626)

Resources: 1 available
  - available_subnet_cidr (provider_doc_id: 11349627)
```

</details>


---

<sub>⏱️ 42s</sub>

### ✅ `terraform-search_providers`

<details>
<summary>Arguments</summary>

```json
{
  "provider_namespace": "pagopa-dx",
  "provider_name": "azure",
  "provider_version": "latest",
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


---

<sub>⏱️ 42s</sub>

### ✅ `terraform-search_providers`

<details>
<summary>Arguments</summary>

```json
{
  "provider_namespace": "pagopa-dx",
  "provider_name": "azure",
  "provider_version": "latest",
  "service_slug": "available_subnet_cidr",
  "provider_document_type": "resources"
}
```

</details>

<details>
<summary>13 lines</summary>

```
Available Documentation (top matches) for resources in Terraform provider pagopa-dx/azure version: 0.8.3

Each result includes:
- providerDocID: tfprovider-compatible identifier
- Title: Service or resource name
- Category: Type of document
- Description: Brief summary of the document
For best results, select libraries based on the service_slug match and category of information requested.

---

- providerDocID: 11349627
- Title: available_subnet_cidr
- Category: resources
- Description: Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.
---
```

</details>


---

<sub>⏱️ 45s</sub>

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


---

<sub>⏱️ 45s</sub>

### ✅ `terraform-get_provider_details`

<details>
<summary>Arguments</summary>

```json
{
  "provider_doc_id": "11349627"
}
```

</details>

<details>
<summary>61 lines</summary>

````
---
page_title: "dx_available_subnet_cidr Resource - terraform-provider-azure"
subcategory: ""
description: |-
  Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.
---

# available_subnet_cidr Resource

Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.

## Example Usage

```hcl
resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = azurerm_virtual_network.example.id
  prefix_length      = 24  # For a /24 subnet
}

resource "azurerm_subnet" "new_subnet" {
  name                 = "example-subnet"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr.cidr_block]
}
```

When creating multiple subnets, it is necessary to use `depends_on` to prevent CIDR block overlaps:

```hcl
resource "dx_available_subnet_cidr" "next_cidr_1" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 24
}

resource "azurerm_subnet" "new_subnet_1" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_1.cidr_block]
}

resource "dx_available_subnet_cidr" "next_cidr_2" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 29

  # Ensures the first CIDR block is allocated before finding the next one
  depends_on = [
    azurerm_subnet.new_subnet_1
  ]
}

resource "azurerm_subnet" "new_subnet_2" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_2.cidr_block]
}
```

## Schema

### Required

- `prefix_length` (Number) The desired prefix length for the new subnet CIDR (e.g., 24 for a /24 subnet). Must be larger than the VNet prefix and smaller or equal to 29.
- `virtual_network_id` (String) The Azure Resource ID of the Virtual Network where the CIDR block should be allocated. Must be in the format `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}`.

### Read-Only

- `id` - A unique identifier for the resource, combining the virtual network ID, prefix length, and allocated CIDR.

- `cidr_block` (String) The calculated available CIDR block.

## Import

This resource cannot be imported as it is a virtual resource that doesn't correspond to an actual Azure resource.

## Notes

- This is a virtual resource that doesn't create an actual resource in Azure. It only calculates and reserves a CIDR block in your Terraform state.
- The allocated CIDR is determined by analyzing the existing subnets in the VNet and finding an available block that doesn't overlap.
- Changing either `virtual_network_id` or `prefix_length` after creation requires recreating the resource.
````

</details>


---

<sub>⏱️ 51s</sub>

### 💬 Copilot

Now I'll create the Terraform files based on the MCP-gathered information:

---

<sub>⏱️ 51s</sub>

### ✅ `bash`

**Create output directory**

$ mkdir -p /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output

```

<exited with exit code 0>
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/versions.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/versions.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/versions.tf with 234 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/providers.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/providers.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/providers.tf with 55 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/variables.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/variables.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/variables.tf with 1696 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/locals.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/locals.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/locals.tf with 1158 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/main.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/main.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/main.tf with 5020 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/outputs.tf**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/outputs.tf

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/outputs.tf with 1592 characters
```


---

<sub>⏱️ 2m 16s</sub>

### ✅ `create`

**/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/README.md**

/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/README.md

```
Created file /Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/README.md with 8043 characters
```


---

<sub>⏱️ 2m 22s</sub>

### 💬 Copilot

Terraform configuration completo generato in `/Users/christian.calabrese/Desktop/repository/dx/experiments/results/mcp/run-1/output/`. Include Function App Node.js 20, Storage Accounts e Cosmos DB serverless con naming DX, tag obbligatori, moduli pagopa-dx e segreti in Key Vault.

---

<sub>Generated by [GitHub Copilot CLI](https://github.com/features/copilot/cli)</sub>
