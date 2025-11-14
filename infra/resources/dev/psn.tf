locals {
  location = "italynorth"

  appgw = {
    frontend_public_config  = "dx-d-itn-psn-appgw-pip-01"
    frontend_private_config = "private-config"
    public_listener_name    = "public-listener"
    private_listener_name   = "private-listener"
    wallet_listener_name    = "wallet-listener"
    google_backend_pool     = "google-pool"
    bing_backend_pool       = "bing-pool"
    wallet_backend_pool     = "wallet-pool"
    private_link_name       = "dx-d-itn-psn-appgw-pl-01"
    private_endpoint_name   = "dx-d-itn-pagopa-psn-appgw-pep-01"
  }
}

#region Resource Groups
resource "azurerm_resource_group" "psn_hub" {
  name     = "dx-d-itn-psn-hub-rg-01"
  location = local.location

  tags = local.tags
}

resource "azurerm_resource_group" "psn_spoke" {
  name     = "dx-d-itn-psn-spoke-rg-01"
  location = local.location

  tags = local.tags
}
#endregion

#region Basic Networking
resource "azurerm_virtual_network" "psn_hub" {
  name                = "dx-d-itn-psn-hub-vnet-01"
  resource_group_name = azurerm_resource_group.psn_hub.name
  location            = local.location
  address_space       = ["10.254.0.0/16"]

  tags = local.tags
}

resource "azurerm_virtual_network" "psn_spoke" {
  name                = "dx-d-itn-psn-spoke-vnet-01"
  resource_group_name = azurerm_resource_group.psn_spoke.name
  location            = local.location
  address_space       = ["10.1.0.0/16"]

  tags = local.tags
}


resource "azurerm_subnet" "psn_hub_pl" {
  name                 = "dx-d-itn-psn-pl-snet-01"
  resource_group_name  = azurerm_resource_group.psn_hub.name
  virtual_network_name = azurerm_virtual_network.psn_hub.name
  address_prefixes     = ["10.254.1.0/24"]

  private_link_service_network_policies_enabled = false
}

resource "azurerm_subnet" "psn_hub_pep" {
  name                 = "dx-d-itn-psn-pep-snet-01"
  resource_group_name  = azurerm_resource_group.psn_hub.name
  virtual_network_name = azurerm_virtual_network.psn_hub.name
  address_prefixes     = ["10.254.2.0/24"]

  private_link_service_network_policies_enabled = false
}

resource "azurerm_subnet" "psn_spoke_pep" {
  name                 = "dx-d-itn-psn-pep-snet-01"
  resource_group_name  = azurerm_resource_group.psn_spoke.name
  virtual_network_name = azurerm_virtual_network.psn_spoke.name
  address_prefixes     = ["10.1.2.0/24"]

  private_link_service_network_policies_enabled = false
}
#endregion

#region Application Gateway

resource "azurerm_public_ip" "psn_appgw" {
  name                = "dx-d-itn-psn-appgw-pip-01"
  resource_group_name = azurerm_resource_group.psn_hub.name
  location            = local.location
  allocation_method   = "Static"

  zones = [1]

  tags = local.tags
}

resource "azurerm_subnet" "psn_appgw" {
  name                 = "dx-d-itn-psn-appgw-snet-01"
  resource_group_name  = azurerm_resource_group.psn_hub.name
  virtual_network_name = azurerm_virtual_network.psn_hub.name
  address_prefixes     = ["10.254.0.0/24"]
}

resource "azurerm_application_gateway" "psn" {
  name                = "dx-d-itn-psn-appgw-01"
  resource_group_name = azurerm_resource_group.psn_hub.name
  location            = local.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 1
  }

  gateway_ip_configuration {
    name      = "ipconfig"
    subnet_id = azurerm_subnet.psn_appgw.id
  }

  frontend_ip_configuration {
    name                 = local.appgw.frontend_public_config
    public_ip_address_id = azurerm_public_ip.psn_appgw.id
  }

  frontend_ip_configuration {
    name                            = local.appgw.frontend_private_config
    private_ip_address_allocation   = "Static"
    private_ip_address              = "10.254.0.6"
    private_link_configuration_name = local.appgw.private_link_name
    subnet_id                       = azurerm_subnet.psn_appgw.id
  }

  backend_address_pool {
    name  = local.appgw.google_backend_pool
    fqdns = ["google.com"]
  }

  backend_address_pool {
    name  = local.appgw.bing_backend_pool
    fqdns = ["bing.com"]
  }

  backend_address_pool {
    name  = local.appgw.wallet_backend_pool
    fqdns = [azurerm_linux_function_app.psn_wallet.default_hostname]
  }

  backend_http_settings {
    name                  = "${local.appgw.google_backend_pool}-setting"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
  }

  backend_http_settings {
    name                  = "${local.appgw.bing_backend_pool}-setting"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
  }

  backend_http_settings {
    name                                = "${local.appgw.wallet_backend_pool}-setting"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    probe_name                          = "${local.appgw.wallet_backend_pool}-probe"
    pick_host_name_from_backend_address = true
  }

  frontend_port {
    name = "${local.appgw.public_listener_name}-port"
    port = 80
  }

  http_listener {
    frontend_ip_configuration_name = local.appgw.frontend_public_config
    frontend_port_name             = "${local.appgw.public_listener_name}-port"
    name                           = local.appgw.public_listener_name
    protocol                       = "Http"
  }

  http_listener {
    frontend_ip_configuration_name = local.appgw.frontend_private_config
    frontend_port_name             = "${local.appgw.public_listener_name}-port"
    name                           = local.appgw.private_listener_name
    protocol                       = "Http"
  }

  request_routing_rule {
    http_listener_name = local.appgw.public_listener_name
    name               = "${local.appgw.public_listener_name}-rule"
    rule_type          = "Basic"
    priority           = 10
    # redirect_configuration_name = "google"
    backend_http_settings_name = "${local.appgw.wallet_backend_pool}-setting"
    backend_address_pool_name  = local.appgw.wallet_backend_pool
  }

  # redirect_configuration {
  #   name                 = "google"
  #   redirect_type        = "Permanent"
  #   target_url           = "https://www.google.com"
  #   include_path         = true
  #   include_query_string = true
  # }


  probe {
    name                                      = "${local.appgw.wallet_backend_pool}-probe"
    protocol                                  = "Https"
    path                                      = "/"
    timeout                                   = 5
    interval                                  = 10
    unhealthy_threshold                       = 10
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200"]
    }
  }

  private_link_configuration {
    name = local.appgw.private_link_name
    ip_configuration {
      name                          = "private-link-nat-ip-01"
      subnet_id                     = azurerm_subnet.psn_hub_pl.id
      private_ip_address_allocation = "Dynamic"
      primary                       = true
    }
  }
}

resource "azurerm_network_security_group" "psn_appgw" {
  name                = "dx-d-itn-psn-appgw-nsg-01"
  location            = local.location
  resource_group_name = azurerm_resource_group.psn_hub.name

  tags = local.tags
}

resource "azurerm_network_security_rule" "psn_appgw_allow_subnet" {
  name        = "AllowInternetInBound"
  access      = "Allow"
  description = "Allow access from internet to AppGW Subnet"
  direction   = "Inbound"
  priority    = 100
  protocol    = "*"

  source_address_prefix = "Internet"
  source_port_range     = "*"

  destination_address_prefixes = [
    azurerm_subnet.psn_appgw.address_prefixes[0],
    azurerm_public_ip.psn_appgw.ip_address
  ]
  destination_port_range = "80"

  resource_group_name         = azurerm_resource_group.psn_hub.name
  network_security_group_name = azurerm_network_security_group.psn_appgw.name
}

resource "azurerm_network_security_rule" "psn_appgw_allow_gatewaymanager" {
  name        = "AllowGatewayManagerInBound"
  access      = "Allow"
  description = "Allow access from GatewayManager"
  direction   = "Inbound"
  priority    = 101
  protocol    = "Tcp"

  source_address_prefix = "GatewayManager"
  source_port_range     = "*"

  destination_address_prefix = "*"
  destination_port_range     = "65200-65535"

  resource_group_name         = azurerm_resource_group.psn_hub.name
  network_security_group_name = azurerm_network_security_group.psn_appgw.name
}

resource "azurerm_subnet_network_security_group_association" "psn_appgw" {
  subnet_id                 = azurerm_subnet.psn_appgw.id
  network_security_group_id = azurerm_network_security_group.psn_appgw.id
}
#endregion

#region Front Door
resource "azurerm_storage_account" "psn_cdn" {
  name                     = "dxditnpsncdnst01"
  resource_group_name      = azurerm_resource_group.psn_spoke.name
  location                 = azurerm_resource_group.psn_spoke.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  allow_nested_items_to_be_public  = false
  public_network_access_enabled    = true
  shared_access_key_enabled        = false
  default_to_oauth_authentication  = true
  cross_tenant_replication_enabled = false

  # network_rules {
  #   default_action = "Allow"
  #   # bypass         = ["AzureServices"]

  #   # Add specific IPs if needed for debugging/management
  #   ip_rules = ["93.49.61.65"]
  # }

  tags = local.tags
}

resource "azurerm_role_assignment" "me_storage_blob_data_contributor" {
  scope                = azurerm_storage_account.psn_cdn.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = "58e3c6d6-c60a-4147-ac68-5636f50012c3"
  description          = "Allow me to upload blobs"
}

resource "azurerm_role_assignment" "pagopa_afd_storage_blob_data_reader" {
  scope                = azurerm_storage_account.psn_cdn.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_cdn_frontdoor_profile.pagopa.identity[0].principal_id
  description          = "Allow Front Door to read blobs"
}

resource "azurerm_storage_container" "assets" {
  name                  = "assets"
  storage_account_id    = azurerm_storage_account.psn_cdn.id
  container_access_type = "private"

  depends_on = [
    azurerm_role_assignment.me_storage_blob_data_contributor
  ]
}

resource "azurerm_storage_blob" "asset" {
  name                   = "appgw.http"
  storage_account_name   = azurerm_storage_account.psn_cdn.name
  storage_container_name = azurerm_storage_container.assets.name
  type                   = "Block"
  source                 = "${path.module}/appgw.http"
}
#endregion

#region Wallet Function App
resource "azurerm_service_plan" "psn_wallet" {
  name                   = "dxditn-psn-wallet-asp-01"
  location               = azurerm_resource_group.psn_spoke.location
  resource_group_name    = azurerm_resource_group.psn_spoke.name
  os_type                = "Linux"
  sku_name               = "P0v4"
  zone_balancing_enabled = false

  tags = local.tags
}

resource "azurerm_storage_account" "psn_wallet_func" {
  name                     = "dxditnpsnwalletfnst01"
  location                 = azurerm_resource_group.psn_spoke.location
  resource_group_name      = azurerm_resource_group.psn_spoke.name
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "LRS"

  public_network_access_enabled   = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  allow_nested_items_to_be_public = false

  tags = local.tags
}

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.psn_hub.name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "file" {
  name                = "privatelink.file.core.windows.net"
  resource_group_name = azurerm_resource_group.psn_hub.name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "queue" {
  name                = "privatelink.queue.core.windows.net"
  resource_group_name = azurerm_resource_group.psn_hub.name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "azurewebsites" {
  name                = "privatelink.azurewebsites.net"
  resource_group_name = azurerm_resource_group.psn_hub.name

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob_hub" {
  name                  = "blob-to-hub-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.psn_hub.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob_spoke" {
  name                  = "blob-to-spoke-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.psn_spoke.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "queue_hub" {
  name                  = "queue-to-hub-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.queue.name
  virtual_network_id    = azurerm_virtual_network.psn_hub.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "queue_spoke" {
  name                  = "queue-to-spoke-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.queue.name
  virtual_network_id    = azurerm_virtual_network.psn_spoke.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "file_hub" {
  name                  = "file-to-hub-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.file.name
  virtual_network_id    = azurerm_virtual_network.psn_hub.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "file_spoke" {
  name                  = "file-to-spoke-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.file.name
  virtual_network_id    = azurerm_virtual_network.psn_spoke.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "azurewebsites_hub" {
  name                  = "azurewebsites-to-hub-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.azurewebsites.name
  virtual_network_id    = azurerm_virtual_network.psn_hub.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "azurewebsites_spoke" {
  name                  = "azurewebsites-to-spoke-vnet"
  resource_group_name   = azurerm_resource_group.psn_hub.name
  private_dns_zone_name = azurerm_private_dns_zone.azurewebsites.name
  virtual_network_id    = azurerm_virtual_network.psn_spoke.id

  tags = local.tags
}

resource "azurerm_private_endpoint" "psn_wallet_st_blob" {
  name                = "dx-d-itn-pswn-wallet-blob-pep-01"
  location            = azurerm_resource_group.psn_spoke.location
  resource_group_name = azurerm_resource_group.psn_spoke.name
  subnet_id           = azurerm_subnet.psn_spoke_pep.id

  private_service_connection {
    name                           = "dx-d-itn-pswn-wallet-blob-pep-01"
    private_connection_resource_id = azurerm_storage_account.psn_wallet_func.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "psn_wallet_st_file" {
  name                = "dx-d-itn-pswn-wallet-file-pep-01"
  location            = azurerm_resource_group.psn_spoke.location
  resource_group_name = azurerm_resource_group.psn_spoke.name
  subnet_id           = azurerm_subnet.psn_spoke_pep.id

  private_service_connection {
    name                           = "dx-d-itn-pswn-wallet-file-pep-01"
    private_connection_resource_id = azurerm_storage_account.psn_wallet_func.id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.file.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "psn_wallet_st_queue" {
  name                = "dx-d-itn-pswn-wallet-queue-pep-01"
  location            = azurerm_resource_group.psn_spoke.location
  resource_group_name = azurerm_resource_group.psn_spoke.name
  subnet_id           = azurerm_subnet.psn_spoke_pep.id

  private_service_connection {
    name                           = "dx-d-itn-pswn-wallet-queue-pep-01"
    private_connection_resource_id = azurerm_storage_account.psn_wallet_func.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.queue.id]
  }

  tags = local.tags
}

resource "azurerm_subnet" "psn_wallet_func" {
  name                 = "dx-d-itn-psn-wallet-func-snet-01"
  virtual_network_name = azurerm_virtual_network.psn_spoke.name
  resource_group_name  = azurerm_virtual_network.psn_spoke.resource_group_name
  address_prefixes     = ["10.1.1.0/24"]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_linux_function_app" "psn_wallet" {
  name                = "dx-d-itn-psn-wallet-func-01"
  location            = azurerm_resource_group.psn_spoke.location
  resource_group_name = azurerm_resource_group.psn_spoke.name

  service_plan_id = azurerm_service_plan.psn_wallet.id

  storage_account_name          = azurerm_storage_account.psn_wallet_func.name
  storage_uses_managed_identity = true
  builtin_logging_enabled       = false

  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = azurerm_subnet.psn_wallet_func.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    http2_enabled                 = true
    always_on                     = true
    vnet_route_all_enabled        = true
    ip_restriction_default_action = "Deny"
    application_stack {
      node_version = 22
    }
  }

  app_settings = merge(
    {
      # https://github.com/projectkudu/kudu/wiki/Configurable-settings#attempt-to-rename-dlls-if-they-cant-be-copied-during-a-webdeploy-deployment-1
      WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = 1
      # https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package#using-website_run_from_package--1
      WEBSITE_RUN_FROM_PACKAGE = 1
      # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
      WEBSITE_DNS_SERVER = "168.63.129.16"
    },
  )

  tags = local.tags

  depends_on = [
    azurerm_private_endpoint.psn_wallet_st_blob,
    azurerm_private_endpoint.psn_wallet_st_file,
    azurerm_private_endpoint.psn_wallet_st_queue,
  ]
}

resource "azurerm_private_endpoint" "psn_wallet_func" {
  name                = "dx-d-itn-psn-wallet-func-pep-01"
  location            = azurerm_resource_group.psn_hub.location
  resource_group_name = azurerm_resource_group.psn_hub.name
  subnet_id           = azurerm_subnet.psn_hub_pep.id

  private_service_connection {
    name                           = "dx-d-itn-psn-wallet-func-pep-01"
    private_connection_resource_id = azurerm_linux_function_app.psn_wallet.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.azurewebsites.id]
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.psn_wallet_func.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.psn_wallet.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_account_contributor" {
  scope                = azurerm_storage_account.psn_wallet_func.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app.psn_wallet.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.psn_wallet_func.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.psn_wallet.identity[0].principal_id
}
#endregion
