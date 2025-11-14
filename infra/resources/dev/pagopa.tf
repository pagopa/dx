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
