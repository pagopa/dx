
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

  force_public_network_access_enabled = true # Public network access enabled for CDN origin reachability

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}

# Example 1: Create a CDN profile with WAF enabled
module "azure_cdn_with_waf" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.5"

  resource_group_name = azurerm_resource_group.example.name

  environment = local.environment

  # Enable WAF for security
  waf_enabled = true

  origins = {
    primary = {
      host_name = module.storage_account.primary_web_host
      priority  = 1
    }
  }

  tags = local.tags
}

# Example 2: Reuse the existing CDN profile and add a new endpoint with different origin

# NOTE: This module depends on resource attributes that cannot be determined until apply
# To work around this, use the -target argument to first apply only example 1,
# then apply the full configuration including example 2.

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

  force_public_network_access_enabled = true

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}

module "azure_cdn_reuse_profile" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.5"

  resource_group_name = azurerm_resource_group.example.name

  environment = merge(local.environment, {
    app_name        = "reuse"
    instance_number = "01"
  })

  # Reuse the existing CDN profile created above
  existing_cdn_frontdoor_profile_id = module.azure_cdn_with_waf.id

  # WAF is already enabled on the profile, create security policy for this endpoint
  waf_enabled = true

  origins = {
    secondary = {
      host_name = module.storage_account_secondary.primary_web_host
      priority  = 1
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

output "cdn_reuse_profile_endpoint" {
  value       = module.azure_cdn_reuse_profile.endpoint_hostname
  description = "CDN endpoint reusing existing profile"
}
