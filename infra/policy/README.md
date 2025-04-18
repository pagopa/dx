# DX - Azure Policy

This directory contains shared Azure Policy rules that any team can choose to apply to its own Azure subscriptions to ensure consistent governance across different environments.
Additionally, the `dev` directory contains Terraform code used to deploy the defined Policy Rules to the DX development subscription on Azure.`

## Repository Structure

```shell
infra/
├── policy/
│   ├── _policy_rules/        # Contains JSON files defining shared policy rules and parameters
│   ├── dev/                  # Policies assigned to the development environment (DEV-ENGINEERING)
```

## Policy Rules (`infra/policy/_policy_rules`)

This directory contains JSON files that define policy rules to be used in Azure, and the JSON file that define the policy rules parameters. These files specify permissions and constraints that can be assigned to users, groups, or services.

## Environment-Specific Policies (`infra/policy/dev`)

These directory contain Terraform resources that deploys the defined policy rules into the provided Azure resources (e.g., Subscriptions).

## Configuration

Each repository that needs to apply a policy must replicate the same structure within the `infra` directory, excluding `_policy_rules`. Terraform resources must reference the policy rules and parameters definition from the `dx` repository. For example:

```hcl
# infra/policy/prod/policy_specific_tags.tf

data "http" "specific_tags_policy_rule" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/specific_tags_rule_v1.json"
}

data "http" "specific_tags_policy_parameters" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/specific_tags_paramenters_v1.json"
}


resource "azurerm_policy_definition" "specific_tags_policy" {
  name         = "${local.project}-specific-tags-policy"
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
  name                 = "${local.project}-specific-tags-assignment"
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
