# https://medium.com/@petrutbelingher/application-gateway-private-dns-resolvers-dns-resolution-private-endpoints-in-azure-489b01f6694c

#region Resource Groups and Networking
resource "azurerm_resource_group" "pagopa" {
  name     = "dx-d-itn-pagopa-rg-01"
  location = local.location

  tags = local.tags
}

resource "azurerm_virtual_network" "pagopa" {
  name                = "dx-d-itn-pagopa-vnet-01"
  resource_group_name = azurerm_resource_group.pagopa.name
  location            = local.location
  address_space       = ["10.0.0.0/16"]

  tags = local.tags
}

resource "azurerm_subnet" "pagopa_pep" {
  name                 = "dx-d-itn-pagopa-pep-snet-01"
  resource_group_name  = azurerm_resource_group.pagopa.name
  virtual_network_name = azurerm_virtual_network.pagopa.name
  address_prefixes     = ["10.0.0.0/24"]

  private_link_service_network_policies_enabled = false
}
#endregion

#region Application Gateway
resource "azurerm_private_endpoint" "pagopa_psn_appgw" {
  name                = local.appgw.private_endpoint_name
  location            = local.location
  resource_group_name = azurerm_resource_group.pagopa.name
  subnet_id           = azurerm_subnet.pagopa_pep.id

  private_service_connection {
    name                           = local.appgw.private_endpoint_name
    private_connection_resource_id = azurerm_application_gateway.psn.id
    is_manual_connection           = false

    subresource_names = [
      local.appgw.frontend_private_config
    ]
  }

  private_dns_zone_group {
    name = "private-dns-zone-group"
    private_dns_zone_ids = [
      azurerm_private_dns_zone.psn_appgw_com.id
    ]
  }

  tags = local.tags
}
#endregion

#region Front Door
resource "azurerm_cdn_frontdoor_profile" "pagopa" {
  name                = "dx-d-itn-pagopa-afd-02"
  resource_group_name = azurerm_resource_group.pagopa.name
  sku_name            = "Standard_AzureFrontDoor"

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_rule_set" "this" {
  name                     = "ruleset"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.pagopa.id
}

resource "azurerm_cdn_frontdoor_endpoint" "pagopa" {
  name                     = "dx-d-itn-pagopa-fde-02"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.pagopa.id

  enabled = true

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_origin_group" "pagopa_blobs" {
  name                     = "blobs-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.pagopa.id
  session_affinity_enabled = false

  load_balancing {}

  health_probe {
    protocol            = "Https"
    interval_in_seconds = 120
  }
}

resource "azurerm_cdn_frontdoor_origin" "storage" {
  name                          = "psn-storage-account"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.pagopa_blobs.id
  enabled                       = true

  certificate_name_check_enabled = true

  host_name          = azurerm_storage_account.psn_cdn.primary_blob_host
  origin_host_header = azurerm_storage_account.psn_cdn.primary_blob_host
  priority           = 1
  weight             = 1000

  # private_link {
  #   target_type            = "blob"
  #   location               = azurerm_storage_account.psn_cdn.location
  #   private_link_target_id = azurerm_storage_account.psn_cdn.id
  # }
}

resource "azurerm_cdn_frontdoor_route" "this" {
  name                          = "dx-d-itn-pagopa-fdr-02"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.pagopa.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.pagopa_blobs.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.storage.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.this.id]
  cdn_frontdoor_origin_path     = "/${azurerm_storage_container.assets.name}"
  # cdn_frontdoor_custom_domain_ids = length(var.custom_domains) > 0 ? [for domain in azurerm_cdn_frontdoor_custom_domain.this : domain.id] : []
  enabled = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = false
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Https"]

  link_to_default_domain = true

  # cache {
  #   query_string_caching_behavior = "IgnoreQueryString"
  # }
}
#endregion

#region IO Function App
resource "azurerm_storage_account" "pagopa_io_func" {
  name                     = "dxditnpagopaiofnst01"
  resource_group_name      = azurerm_resource_group.pagopa.name
  location                 = azurerm_resource_group.pagopa.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "flex" {
  name                  = "flex-container"
  storage_account_id    = azurerm_storage_account.pagopa_io_func.id
  container_access_type = "private"
}

resource "azurerm_subnet" "pagopa_io" {
  name                 = "dx-d-itn-pagopa-io-func-snet-01"
  resource_group_name  = azurerm_resource_group.pagopa.name
  virtual_network_name = azurerm_virtual_network.pagopa.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_service_plan" "pagopa_io" {
  name                = "dx-d-itn-pagopa-io-asp-01"
  resource_group_name = azurerm_resource_group.pagopa.name
  location            = azurerm_resource_group.pagopa.location
  sku_name            = "FC1"
  os_type             = "Linux"

  tags = local.tags
}

resource "azurerm_function_app_flex_consumption" "pagopa_io" {
  name                = "dx-d-itn-pagopa-io-func-01"
  resource_group_name = azurerm_resource_group.pagopa.name
  location            = azurerm_resource_group.pagopa.location
  service_plan_id     = azurerm_service_plan.pagopa_io.id

  virtual_network_subnet_id = azurerm_subnet.pagopa_io.id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.pagopa_io_func.primary_blob_endpoint}${azurerm_storage_container.flex.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.pagopa_io_func.primary_access_key
  runtime_name                = "dotnet-isolated"
  runtime_version             = "9.0"

  site_config {}

  tags = local.tags
}

resource "azurerm_private_dns_zone" "psn_appgw_com" {
  name                = "psn_appgw.com"
  resource_group_name = azurerm_resource_group.pagopa.name

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "pagopa_psn_appgw_com" {
  name                  = "${azurerm_virtual_network.pagopa.name}-link"
  resource_group_name   = azurerm_resource_group.pagopa.name
  private_dns_zone_name = azurerm_private_dns_zone.psn_appgw_com.name
  virtual_network_id    = azurerm_virtual_network.pagopa.id

  registration_enabled = false

  tags = local.tags
}

resource "azurerm_private_dns_a_record" "hub" {
  name                = "hub"
  zone_name           = azurerm_private_dns_zone.psn_appgw_com.name
  resource_group_name = azurerm_resource_group.pagopa.name
  ttl                 = 10
  records             = [azurerm_private_endpoint.pagopa_psn_appgw.private_service_connection[0].private_ip_address]
}

#endregion
