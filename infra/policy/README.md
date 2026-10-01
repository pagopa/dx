# DX - Azure Policy

This directory contains Azure Policy rules and assignments used by DX's Azure
environments. The `dev` directory deploys the DevEx tagging policy to the DX
development subscription.

## DevEx Tagging Policy

DevEx-owned resources follow the case-sensitive `CostCenter = "TS000 - TECNOLOGIA & SERVIZI"`,
`Owner = "DevEx"`, `Environment = "Dev"/"Uat"/"Prod"`, and `Source` pointing to
the Terraform configuration root on the default branch.

The policy rule and parameters are in `_policy_rules/specific_tags_rule_v1.json`
and `_policy_rules/specific_tags_parameters_v1.json`. These tags are optional:
resources may omit them or assign only a subset. When present, `CostCenter` must
match the assigned DevEx value, `Owner` must be `DevEx`, `Environment` must be
`Dev`, `Uat`, or `Prod`, and `Source` must point to a non-empty Terraform root
under `https://github.com/pagopa/dx/blob/main/infra/`. Tag names and values are
checked with the agreed casing.

The policy no longer requires `CreatedBy`, `BusinessUnit`, or `ManagementTeam`.
Those old parameters remain declared and supplied by the development assignment
to keep the existing Azure policy-definition schema stable; the rule does not
use them. Apply the updated development policy before the development
bootstrapper, core, and resources configurations, because the previous deny
rule may reject the new tag values. The policy does not automatically retag
existing resources.

The policy uses `Indexed` mode for taggable Azure resources. DX configures AWS
provider default tags separately and passes explicit tags to AWS Cloud Control
resources.

## Local Regression Checks

Run `pnpm nx test pre_commit_scripts` to check the nine DX root tag maps, AWS
provider defaults, explicit resource tags, and the optional policy contract.
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

## Development Assignment

The DevEx rule and assignment are configured in `infra/policy/dev`. The
assignment supplies the legacy parameters still declared by the policy
definition so its Azure schema remains stable; the current rule only uses the
`CostCenter` parameter.
