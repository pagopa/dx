
resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "cdn-advanced",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

# Create a storage account with static website enabled
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  use_case            = "default"
  subnet_pep_id       = data.azurerm_subnet.pep.id

  force_public_network_access_enabled = false # Private access only

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}

# Example 1: CDN with WAF enabled and managed identity for storage origin
module "azure_cdn_with_waf" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.5"

  resource_group_name = azurerm_resource_group.example.name

  environment = local.environment

  # Enable WAF for security
  waf_enabled = true

  # Configure origin with managed identity for private storage access
  origins = {
    primary = {
      host_name            = module.storage_account.primary_web_host
      priority             = 1
      use_managed_identity = true
      storage_account_id   = module.storage_account.id
    }
  }

  # Note: Remove custom_domains if you don't have a real DNS zone
  # custom_domains = [
  #   {
  #     host_name = "secure-app.example.com",
  #     dns = {
  #       zone_name                = "example.com",
  #       zone_resource_group_name = azurerm_resource_group.example.name
  #     }
  #   }
  # ]

  tags = local.tags
}

# Example 2: Multiple storage origins with managed identity
module "storage_account_secondary" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment = merge(local.environment, {
    app_name        = "media"
    instance_number = "01"
  })

  resource_group_name = azurerm_resource_group.example.name
  use_case            = "default"
  subnet_pep_id       = data.azurerm_subnet.pep.id

  force_public_network_access_enabled = false

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}

module "azure_cdn_multi_origin" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.5"

  resource_group_name = azurerm_resource_group.example.name

  environment = merge(local.environment, {
    app_name        = "multi"
    instance_number = "01"
  })

  waf_enabled = true

  # Multiple origins with different priorities and managed identity
  # Note: Origin keys cannot contain underscores, use hyphens instead
  origins = {
    primary = {
      host_name            = module.storage_account.primary_web_host
      priority             = 1
      use_managed_identity = true
      storage_account_id   = module.storage_account.id
    }
    secondary = {
      host_name            = module.storage_account_secondary.primary_web_host
      priority             = 2
      use_managed_identity = true
      storage_account_id   = module.storage_account_secondary.id
    }
  }

  tags = local.tags
}

output "cdn_with_waf_endpoint" {
  value       = module.azure_cdn_with_waf.endpoint_hostname
  description = "CDN endpoint with WAF protection"
}

output "cdn_with_waf_profile_id" {
  value       = module.azure_cdn_with_waf.id
  description = "CDN profile ID that can be reused"
}

output "cdn_multi_origin_endpoint" {
  value       = module.azure_cdn_multi_origin.endpoint_hostname
  description = "CDN endpoint with multiple storage origins"
}
