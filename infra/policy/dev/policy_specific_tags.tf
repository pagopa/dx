resource "azurerm_policy_definition" "specific_tags_policy" {
  name         = "${local.project}-specific-tags-policy-v2"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "DevEx Enforce specific tags and values on resources"
  description  = "Validates DevEx tag values when CostCenter, Owner, Environment or Source tags are assigned."

  metadata = jsonencode({
    category = "Custom DevEx"
    version  = "2.0.0"
  })

  policy_rule = file("${path.module}/../_policy_rules/specific_tags_rule_v2.json")

  parameters = file("${path.module}/../_policy_rules/specific_tags_parameters_v2.json")

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_subscription_policy_assignment" "specific_tags_assignment" {
  name                 = "${local.project}-specific-tags-assignment"
  display_name         = "DevEx Enforce specific tags and values on resources"
  policy_definition_id = azurerm_policy_definition.specific_tags_policy.id
  subscription_id      = data.azurerm_subscription.current.id

  parameters = jsonencode({
    "CostCenter" = {
      "value" = "TS000 - TECNOLOGIA & SERVIZI"
    }
  })
}