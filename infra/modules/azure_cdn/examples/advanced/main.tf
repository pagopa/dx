
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

resource "azurerm_storage_account" "origin" {
  for_each = toset(["primary", "secondary"])

  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = each.key == "primary" ? local.environment.app_name : "media",
    resource_type = "storage_account"
  }))
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  public_network_access    = "Enabled"
  tags                     = local.tags
}

resource "azurerm_storage_account_static_website" "origin" {
  for_each = azurerm_storage_account.origin

  storage_account_id = each.value.id
  index_document     = "index.html"
}

data "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.virtual_network.resource_group_name
}

resource "azurerm_private_endpoint" "origin" {
  for_each = azurerm_storage_account.origin

  name                = "${each.value.name}-blob-pep"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  subnet_id           = data.azurerm_subnet.pep.id
  tags                = local.tags

  private_service_connection {
    name                           = "${each.value.name}-blob"
    private_connection_resource_id = each.value.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "blob"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.blob.id]
  }
}

# Example 1: Create a CDN profile with WAF enabled
module "azure_cdn_with_waf" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 3.0"

  resource_group_name = azurerm_resource_group.example.name

  environment = local.environment

  # Enable WAF for security
  waf_enabled = true

  origins = {
    primary = {
      host_name = azurerm_storage_account.origin["primary"].primary_web_host
      priority  = 1
    }
  }

  tags = local.tags

  depends_on = [azurerm_storage_account_static_website.origin]
}

# Example 2: Reuse the existing CDN profile and add a new endpoint with different origin

# NOTE: This module depends on resource attributes that cannot be determined until apply
# To work around this, use the -target argument to first apply only example 1,
# then apply the full configuration including example 2.

module "azure_cdn_reuse_profile" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 3.0"

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
      host_name = azurerm_storage_account.origin["secondary"].primary_web_host
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
