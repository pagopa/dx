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
      CostCenter     = { value = "TS000 - TECNOLOGIA & SERVIZI" }
      BusinessUnit   = { value = ["DevEx"] }
      ManagementTeam = { value = ["Developer Experience"] }
      SourceOrg      = { value = "pagopa" }
    }
    error_message = "The development assignment must use the agreed CostCenter value and preserve the existing policy parameters."
  }

  assert {
    condition     = toset(keys(jsondecode(azurerm_policy_definition.specific_tags_policy.parameters))) == toset(["CostCenter", "BusinessUnit", "ManagementTeam", "SourceOrg"])
    error_message = "The existing policy parameter schema must remain stable."
  }

  assert {
    condition     = azurerm_policy_definition.specific_tags_policy.name == "dx-d-itn-specific-tags-policy"
    error_message = "The existing policy definition should be updated instead of replacing it with a new version."
  }

  assert {
    condition     = strcontains(azurerm_policy_definition.specific_tags_policy.policy_rule, "\"exists\": true")
    error_message = "Tag-value checks must be conditional on the tag being assigned."
  }

  assert {
    condition     = jsondecode(azurerm_policy_definition.specific_tags_policy.policy_rule).then.effect == "deny"
    error_message = "The policy must deny resources with noncompliant tags."
  }
}
