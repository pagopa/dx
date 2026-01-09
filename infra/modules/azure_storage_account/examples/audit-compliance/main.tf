data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_log_analytics_workspace" "law" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "common",
    resource_type = "resource_group"
  }))
}

resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = local.environment.location
}

module "azure_storage_account" {
  source = "../../"

  environment         = local.environment
  use_case            = "audit"
  secondary_location  = "westeurope"
  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  customer_managed_key = {
    enabled = true
  }

  diagnostic_settings = {
    enabled                    = true
    log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id
  }

  subservices_enabled = {
    blob = true
    file = true
  }

  containers = [
    {
      name        = "example1"
      access_type = "private"
      # Example: Immutable container with a 3-year retention policy
      immutability_policy = {
        period_in_days = 1095
        locked         = true # Locked to prevent modifications
      }
    },
    {
      name        = "example2"
      access_type = "private"
      # Example: Container-level immutability with unlocked policy
      immutability_policy = {
        period_in_days = 365
        locked         = false # Keep unlocked to allow policy modifications
      }
    }
  ]

  tags = local.tags
}
