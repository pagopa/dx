resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-example-rg-${local.environment.instance_number}"
  location = local.environment.location
}

module "cosmos_db" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  tier = "s"

  subnet_pep_id = data.azurerm_subnet.pep.id

  consistency_policy = {
    consistency_preset = "HighConsistency"
  }

  alerts = {
    enabled         = true
    action_group_id = data.azurerm_monitor_action_group.example.id
    thresholds = {
      provisioned_throughput_exceeded = 900
    }
  }

  tags = local.tags
}