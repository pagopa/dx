# Module Under Test — the azure_storage_account module being demonstrated.
# Supporting infrastructure is defined in fixtures.tf.

module "azure_storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

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
