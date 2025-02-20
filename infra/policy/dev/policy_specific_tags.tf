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

  policy_rule = templatestring(data.http.policy.response_body, {})

  parameters = jsonencode({})
}

resource "azurerm_subscription_policy_assignment" "specific_tags_assignment" {
  name                 = "${module.naming_convention.project}-specific-tags-assignment"
  display_name         = "DevEx Enforce specific tags and values on resources"
  policy_definition_id = azurerm_policy_definition.specific_tags_policy.id
  subscription_id      = data.azurerm_subscription.current.id
}