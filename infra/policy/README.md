# DX - Azure Policy

This folder contains all the Azure Policies made by DX and is designed to manage and deploy Azure policies using Terraform.
It organizes policy definitions and role assignments to ensure consistent governance across different environments.

## Repository Structure

```shell
infra/
├── policy/
│   ├── _policy_rules/        # Contains JSON files defining JSON role policies and parameters
│   ├── dev/                  # Policies assigned to the development environment (DEV-ENGINEERING)
```

## Policy Rules (`infra/policy/_policy_rules`)

This directory contains JSON files that define the role policies to be used in Azure, and the JSON file that define the policy parameters. These files specify permissions and constraints that can be assigned to users, groups, or services.

## Environment-Specific Policies (`infra/policy/dev`)

These directory contain the policies that will be assigned using Terraform. Each policy references the definitions in `_policy_rules` and applies them to the appropriate Azure resources.

## Configuration

Each repository that needs to configure a policy must replicate the same structure within the infra folder, excluding _policy_rules. Policies should reference a definition from the dx repository. For example:

```hcl
# infra/policy/prod/policy_specific_tags.tf

data "http" "specific_tags_policy_rule" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/specific_tags_rule_v1.json"
}

data "http" "specific_tags_policy_parameters" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/specific_tags_paramenters_v1.json"
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

  policy_rule = file(data.http.specific_tags_policy_rule.response_body)

  parameters = file(data.http.specific_tags_policy_parameters.response_body)
}


resource "azurerm_subscription_policy_assignment" "specific_tags_assignment" {
  name                 = "${module.naming_convention.project}-specific-tags-assignment"
  display_name         = "DevEx Enforce specific tags and values on resources"
  policy_definition_id = azurerm_policy_definition.specific_tags_policy.id
  subscription_id      = data.azurerm_subscription.current.id

  parameters = jsonencode({
    "CostCenter" = {
      "value" = "TS000 - Tecnologia e Servizi"
    },
    "BusinessUnit" = {
      "value" = [
        "App IO",
        "CGN",
        "Carta della Cultura",
        "IT Wallet",
      ]
    },
    "ManagementTeam" = {
      "value" = [
        "IO Enti & Servizi",
        "IO Platform",
        "IO Wallet",
        "IO Comunicazione",
        "IO Autenticazione",
        "IO Bonus & Pagamenti",
        "IO Firma",
      ]
    },
    "SourceOrg" = {
      "value" = "pagopa"
    }
  })
}
```
