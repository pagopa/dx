module "cosmos_db" {
  source = "../../"

  environment         = local.environment
  resource_group_name = "example-rg"

  subnet_pep_id = data.azurerm_subnet.pep.id

  consistency_policy = {
    consistency_preset = "HighConsistency"
  }

  alerts = {
    enabled = false
  }

  tags = local.tags
}