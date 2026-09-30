# DX - Azure Policy

This directory contains shared Azure Policy rules that any team can choose to apply to its own Azure subscriptions to ensure consistent governance across different environments.
Additionally, the `dev` directory deploys the v2 DevEx tagging policy to the DX development subscription on Azure.

## DevEx Tagging Policy (v2)

DevEx-owned resources require case-sensitive `CostCenter = "TS000 - TECNOLOGIA & SERVIZI"`,
`Owner = "DevEx"`, `Environment = "Dev"/"Uat"/"Prod"`, and `Source` pointing to the
Terraform configuration root on the default branch.

The v2 rule and parameters are in `_policy_rules/specific_tags_rule_v2.json` and
`_policy_rules/specific_tags_parameters_v2.json`. The development assignment sets
`Environment = "Dev"` and `SourcePrefix = "https://github.com/pagopa/dx/blob/main/infra/"`.
The policy checks exact tag-name spelling, case-sensitive values, and a nonempty
configuration path under that source prefix. It does not require the legacy
`CreatedBy`, `BusinessUnit`, or `ManagementTeam` tags.

Apply `infra/policy/dev` before applying the new tags in the development
bootstrapper, core, and resources roots: the previous deny policy requires the
legacy tags. The v2 definition has a new name and `create_before_destroy`, allowing
Terraform to create it, switch the assignment, and delete the old definition.
This is necessary because Azure disallows removing parameters from existing
definitions. The policy does not automatically retag existing resources.

The policy uses `Indexed` mode for taggable Azure resources. DX configures AWS
provider default tags separately and passes explicit tags to AWS Cloud Control
resources.

## Backward Compatibility

The shared v1 JSON files remain unchanged for external teams. Registry-published
Terraform modules and generic CLI templates retain their consumer-defined tags.
The configuration example below documents the legacy v1 policy, not the DevEx
v2 assignment.

## Local Regression Checks

Run `pnpm nx test pre_commit_scripts` to check the nine DX root tag maps, AWS
provider defaults, explicit resource tags, and the v2 policy contract.
Run `pnpm nx test policy-dev` to check the Terraform assignment with a mocked
AzureRM provider. This target initializes providers with the remote backend
disabled; it does not deploy resources or evaluate the rule in Azure.

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
