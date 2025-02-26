resource "azurerm_policy_definition" "add_modified_date_tag_policy" {
  name         = "${module.naming_convention.project}-add-modified-date-tag-policy"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "DevEx Add ModifiedOn TAG on new resources"
  description  = "Ensures that new resources created on Azure Portal have ModifiedOn tag with last change date."

  metadata = jsonencode({
    category = "Custom DevEx"
    version  = "1.0.0"
  })

  policy_rule = file("../_policy_rules/add_modified_date_tag_rule_v1.json")

  parameters = file("../_policy_rules/add_modified_date_tag_parameters_v1.json")
}

resource "azurerm_subscription_policy_assignment" "add_modified_date_tag_assignment" {
  name                 = "${module.naming_convention.project}-add-modified-date-tag-assignment"
  display_name         = "DevEx Add ModifiedOn TAG on new resources"
  policy_definition_id = azurerm_policy_definition.add_modified_date_tag_policy.id
  subscription_id      = data.azurerm_subscription.current.id
  location             = local.environment.location

  identity {
    type = "SystemAssigned"
  }

  parameters = jsonencode({
    "Environment" = {
      "value" = "Dev"
    },
  })
}