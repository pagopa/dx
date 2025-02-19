# DX - Azure Policy

This folder contains all the Azure Policies made by DX and is designed to manage and deploy Azure policies using Terraform.
It organizes policy definitions and role assignments to ensure consistent governance across different environments.

## Repository Structure

```shell
infra/
├── policy/
│   ├── _policy_rules/        # Contains Terraform templates files defining JSON role policies
│   ├── dev/                  # Policies assigned to the development environment (DEV-ENGINEERING)
```

## Policy Rules (`infra/policy/_policy_rules`)

This directory contains Terraform Template files that define the JSON role policies to be used in Azure. These files specify permissions and constraints that can be assigned to users, groups, or services.

## Environment-Specific Policies (`infra/policy/dev`)

These directory contain the policies that will be assigned using Terraform. Each policy references the definitions in `_policy_rules` and applies them to the appropriate Azure resources.

## Configuration

Each repository that needs to configure a policy must replicate the same structure within the infra folder, excluding _policy_rules. Policies should reference a definition from the dx repository. For example:

```hcl
# infra/policy/prod/policy_specific_tags.tf

data "http" "specific_tags_policy_rule" {
  url = "https://raw.githubusercontent.com/pagopa/dx/[COMMIT_SHA]/infra/policy/_policy_rules/specific_tags_role_v1.json.tftpl"
}

resource "azurerm_policy_definition" "specific_tags_policy" {
  name         = "${module.naming_convention.project}-specific-tags-policy"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "DevEx Enforce specific tags and values on resources"
  description  = "Ensures that resources have specific tags and values during creation."

  metadata = jsonencode({
    category = "Custom DevEx"
    version  = "1.0.0"
  })

  policy_rule = templatefile(data.http.specific_tags_policy_rule.response_body, {
    cost_center = "TS000 - Tecnologia e Servizi",
    business_units = [
      "App IO",
      "CGN",
      "Carta della Cultura",
      "IT Wallet",
    ],
    management_teams = [
      "IO Enti & Servizi",
      "IO Platform",
      "IO Wallet",
      "IO Comunicazione",
      "IO Autenticazione",
      "IO Bonus & Pagamenti",
      "IO Firma",
    ]
  })

  parameters = jsonencode({})
}
```
