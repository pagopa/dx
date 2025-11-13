locals {
  location = "italynorth"

  appgw = {
    frontend_public_config  = "dx-d-itn-psn-appgw-pip-01"
    frontend_private_config = "private-config"
    public_listener_name    = "public-listener"
    private_listener_name   = "private-listener"
    google_backend_pool     = "google-pool"
    bing_backend_pool       = "bing-pool"
    private_link_name       = "dx-d-itn-psn-appgw-pl-01"
    private_endpoint_name   = "dx-d-itn-pagopa-psn-appgw-pep-01"
  }
}

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

resource "azurerm_virtual_network" "psn_hub" {
  name                = "dx-d-itn-psn-hub-vnet-01"
  resource_group_name = azurerm_resource_group.psn_hub.name
  location            = local.location
  address_space       = ["10.254.0.0/16"]

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

# Application Gateway

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
    http_listener_name          = local.appgw.public_listener_name
    name                        = "${local.appgw.public_listener_name}-rule"
    rule_type                   = "Basic"
    priority                    = 10
    redirect_configuration_name = "google"
  }

  redirect_configuration {
    name                 = "google"
    redirect_type        = "Permanent"
    target_url           = "https://www.google.com"
    include_path         = true
    include_query_string = true
  }

  request_routing_rule {
    http_listener_name          = local.appgw.private_listener_name
    name                        = "${local.appgw.private_listener_name}-rule"
    rule_type                   = "Basic"
    priority                    = 11
    redirect_configuration_name = "bing"
  }

  redirect_configuration {
    name                 = "bing"
    redirect_type        = "Permanent"
    target_url           = "https://www.bing.com"
    include_path         = true
    include_query_string = true
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

# Front Door
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
