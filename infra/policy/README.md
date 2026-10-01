# DX - Azure Policy

This directory contains shared Azure Policy rules that any team can choose to apply to its own Azure subscriptions to ensure consistent governance across different environments.
Additionally, the `dev` directory contains Terraform code used to deploy the defined Policy Rules to the DX development subscription on Azure.`

## Repository Structure

```shell
infra/
├── policy/
│   ├── _policy_rules/        # Contains JSON files defining shared policy rules
│   ├── dev/                  # Policies assigned to the development environment (DEV-ENGINEERING)
```

## Policy Rules (`infra/policy/_policy_rules`)

This directory contains JSON files that define policy rules to be used in Azure, and the JSON file that define the policy rules parameters. These files specify permissions and constraints that can be assigned to users, groups, or services.

## Environment-Specific Policies (`infra/policy/dev`)

These directory contain Terraform resources that deploys the defined policy rules into the provided Azure resources (e.g., Subscriptions).

## Development Assignment

The DevEx rule and assignment are configured in `infra/policy/dev`; the
assignment requires no parameters.
