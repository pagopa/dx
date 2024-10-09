module "cosmos_db" {
  source = "../../"

  environment         = local.environment
  resource_group_name = "example-rg"

  subnet_pep_id = data.azurerm_subnet.pep.id

  consistency_policy = {
    consistency_preset       = "high_consistency"
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