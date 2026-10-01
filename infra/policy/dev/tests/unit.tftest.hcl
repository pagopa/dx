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
    condition     = azurerm_subscription_policy_assignment.specific_tags_assignment.parameters == null
    error_message = "The development assignment must not require policy parameters."
  }

  assert {
    condition     = azurerm_policy_definition.specific_tags_policy.parameters == null
    error_message = "The policy definition must not declare parameters."
  }

  assert {
    condition     = azurerm_policy_definition.specific_tags_policy.name == "dx-d-itn-specific-tags-policy-v2"
    error_message = "A new definition is required to remove parameters from the existing assigned policy."
  }

  assert {
    condition     = strcontains(azurerm_policy_definition.specific_tags_policy.policy_rule, "\"exists\": true")
    error_message = "Tag-value checks must be conditional on the tag being assigned."
  }

  assert {
    condition     = strcontains(azurerm_policy_definition.specific_tags_policy.policy_rule, "TS000 - TECNOLOGIA & SERVIZI") && !strcontains(azurerm_policy_definition.specific_tags_policy.policy_rule, "parameters(")
    error_message = "The agreed CostCenter value must be hardcoded in the rule without policy parameters."
  }

  assert {
    condition     = jsondecode(azurerm_policy_definition.specific_tags_policy.policy_rule).then.effect == "deny"
    error_message = "The policy must deny resources with noncompliant tags."
  }
}
