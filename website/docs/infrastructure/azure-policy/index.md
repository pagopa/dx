---
sidebar_label: Azure Policy Guide
---

# Azure Policy Guide

Azure Policies are governance tools provided by Microsoft Azure to create, assign, and manage rules that ensure compliance and adherence to enterprise standards for cloud resources. More information is available in the official documentation: [Azure Policy Overview](https://learn.microsoft.com/en-us/azure/governance/policy/overview)

## Index

1. [Objective](#objective)
2. [Policy Configuration](#policy-configuration)
    - [Reference Documentation](#reference-documentation)
    - [Defining Policy Rules](#defining-policy-rules)
        - [Adding a Policy Rule](#adding-a-policy-rule)
    - [Defining Parameters](#defining-parameters)
        - [Adding a Set of Parameters](#adding-a-set-of-parameters)
    - [Applying Policies via Terraform](#applying-policies-via-terraform)
3. [Versioning Policy Rules and Parameters](#versioning-policy-rules-and-parameters)
4. [Policy Deploymenty](#policy-deployment)

---

## Goal

To improve the control and management of resources across different **product team subscriptions**, the **DX** team provides a predefined set of policies that product teams can apply to one or more Azure subscriptions. These policies allow better monitoring of critical configurations and resources, ensuring higher standardization and security.

Once applied, these policies help maintain an organized and compliant environment, reducing the risk of misconfigurations or unauthorized changes.

**DX Policies** extend the functionalities of the [Technology Shared Policies](https://pagopa.atlassian.net/wiki/spaces/DEVOPS/pages/459375134). Unlike DX Policies, which have a limited scope, Technology Shared Policies apply to all corporate subscriptions without distinction.

Product teams can also propose new DX Policies for additional requirements.

Policies are applied via Terraform, and the rules that implement them (`policyRule`) are stored in the [DX Repository](https://github.com/pagopa/dx).

This guide explains the steps required to apply existing policies or add new ones.

---

## Policy Configuration

Azure Policies are commonly defined in _JSON_ and consist of multiple components: `policyRule` definitions, `parameters`, and metadata required for deployment on Azure. Since we manage the latter using Terraform, the only two sections that remain defined in _JSON_ are lists of `policyRule` and `parameters`.

### Reference Documentation

- [Azure Repository with Built-in Policies](https://github.com/Azure/azure-policy)
- [Tutorial: Creating and Managing Policies](https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage)
- [Structure definition: Azure Policy Rule](https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule)
- [Structure definition: Azure Policy Parameters](https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-parameters)

### Defining Policy Rules

Policy Rules consist of if/then blocks that define the conditions to be evaluated once the policy is assigned.

#### Adding a Policy Rule

To add a new rule:

1. Create a file named `<POLICY_SUMMARY>_rule_v<VERSION>.json` inside the `infra/policy/_policy_rules` directory of the **DX** repository.
2. Define the `policyRule` inside the file following the documentation guidelines.

##### Example of a Policy Rule

For example, to create a policy that prevents resource creation outside a configurable region, create the file `allowed_location_rule_v1.json` with the following content:

```json
{
  "if": {
    "not": [
      {
        "field": "location",
        "equals": "[parameters('location')]"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

Here, `[parameters('location')]` is the reference to the associated parameter.

---

### Defining Parameters

When defining a rule, parameters can be specified as configurable variables. These must also be defined in a _JSON_ file.

#### Adding a Set of Parameters

To add a new set of parameters:

1. Create a file `<POLICY_SUMMARY>_parameters_v<VERSION>.json` within the DX repository directory `infra/policy/_policy_rules`.
2. Define the parameters inside the file following the documentation guidelines.

#### Example of Parameters

Continuing the previous example, create the file `allowed_location_parameters_v1.json` with the following content:

```json
{
  "location": {
    "type": "String",
    "metadata": {
      "displayName": "Allowed Locations",
      "description": "Specify the allowed Locations value."
    }
  }
}
```

This ensures that when the policy is assigned, a parameter must be set.

> It is also possible to specify a list of **allowed** values and a **default** value. For more details, refer to the official documentation.

---

### Applying Policies via Terraform

Once the Policy Rule and its corresponding `Parameters` are defined, the policy must be deployed using Terraform. Product teams that wish to apply DX Policy Rules to one or more subscriptions should create the necessary descriptors in **their repository** following this file structure:

```yaml
infra/
├── policy/
    ├── <dev/uat/prod>
         ├── <policy_name>.tf
         ├── data.tf
```

#### Example of Terraform Definition

```hcl
# data.tf File

data "http" "allowed_location_policy_rule" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/allowed_location_rule_v1.json"
}

data "http" "allowed_location_policy_parameters" {
  url = "https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/policy/_policy_rules/allowed_location_parameters_v1.json"
}
```

```hcl
# allowed_locations.tf File

resource "azurerm_policy_definition" "allowed_location_policy" {
  name         = "${module.naming_convention.project}-allowed-location-policy"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "DevEx Enforce italynorth location on resources"
  description  = "Ensures that resources have italynorth location during creation."

  metadata = jsonencode({
    category = "Custom DevEx"
    version  = "1.0.0"
  })

  policy_rule = data.http.allowed_location_policy_rule.response_body
  parameters  = data.http.allowed_location_policy_parameters.response_body
}

resource "azurerm_subscription_policy_assignment" "allowed_location_assignment" {
  name                 = "${module.naming_convention.project}-allowed-location-assignment"
  display_name         = "DevEx Enforce italynorth location on resources"
  policy_definition_id = azurerm_policy_definition.allowed_location_policy.id
  subscription_id      = data.azurerm_subscription.current.id

  parameters = jsonencode({
    "location" = {
      "value" = "Italy North"
    }
  })
}
```

---

## Versioning Policy Rules and Parameters

When creating or modifying Policy Rules and/or Parameters in the DX repository, update the `<VERSION>` reference in the _JSON_ file name:

- `<POLICY_SUMMARY>_rule_v<VERSION>.json`
- `<POLICY_SUMMARY>_parameters_v<VERSION>.json`

The version should be an incrementing integer (e.g., v1, v2, …). The file name should only be updated in case of breaking changes.

---

## Policy Deployment

Once everything is configured, the product team will submit a Pull Request. Optionally, they can share it with the **DX** team for review before merging and applying it in production via the GitHub Action that triggers terraform apply.
