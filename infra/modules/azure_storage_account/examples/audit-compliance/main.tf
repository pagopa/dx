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

resource "azurerm_subnet" "example" {
  name                 = "example-subnet"
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
  address_prefixes     = ["10.50.246.0/24"]
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
    # type         = "kv"
    # key_vault_id = "your-kv-id"
  }

  diagnostic_settings = {
    enabled                    = true
    log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id
  }

  subservices_enabled = {
    blob = true
    file = true
  }

  network_rules = {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = ["203.0.113.0/24"]
    virtual_network_subnet_ids = [azurerm_subnet.example.id]
  }

  static_website = {
    enabled            = true
    index_document     = "index.html"
    error_404_document = "404.html"
  }

  custom_domain = {
    name          = "example.com"
    use_subdomain = true
  }

  containers = [
    {
      name        = "example1"
      access_type = "private"
    },
    {
      name        = "example2"
      access_type = "private"
      # Example: Container-level immutability with legal hold capability
      immutability_policy = {
        period_in_days  = 365
        locked          = false # Keep unlocked to allow legal hold modifications
        legal_hold_tags = []    # Add tags like ["case2024", "investigation"] for legal holds
      }
    }
  ]

  tags = local.tags
}
