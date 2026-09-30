mock_provider "azurerm" {
  mock_data "azurerm_subscription" {
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000001"
    }
  }
}

run "devex_tag_policy_contract" {
  command = plan

  assert {
    condition = jsondecode(azurerm_subscription_policy_assignment.specific_tags_assignment.parameters) == {
      CostCenter   = { value = "TS000 - TECNOLOGIA & SERVIZI" }
      Owner        = { value = "DevEx" }
      Environment  = { value = "Dev" }
      SourcePrefix = { value = "https://github.com/pagopa/dx/blob/main/infra/" }
    }
    error_message = "The development assignment must use the agreed DevEx tags and the main-branch source prefix."
  }

  assert {
    condition     = toset(keys(jsondecode(azurerm_policy_definition.specific_tags_policy.parameters))) == toset(["CostCenter", "Owner", "Environment", "SourcePrefix"])
    error_message = "The v2 policy must not require legacy CreatedBy, BusinessUnit or ManagementTeam tags."
  }

  assert {
    condition     = jsondecode(azurerm_policy_definition.specific_tags_policy.parameters).Environment.allowedValues == ["Dev", "Uat", "Prod"]
    error_message = "Environment values must retain their case-sensitive spelling."
  }

  assert {
    condition     = azurerm_policy_definition.specific_tags_policy.name == "dx-d-itn-specific-tags-policy-v2"
    error_message = "The incompatible parameter schema requires a new policy definition name."
  }

  assert {
    condition     = jsondecode(azurerm_policy_definition.specific_tags_policy.policy_rule).then.effect == "deny"
    error_message = "The policy must deny resources with noncompliant tags."
  }
}
