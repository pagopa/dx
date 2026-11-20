mock_provider "aws" {}
mock_provider "azurerm" {}
mock_provider "time" {}

override_data {
  target = data.aws_region.current
  values = {
    name = "eu-south-1"
  }
}

override_data {
  target = data.aws_caller_identity.current
  values = {
    account_id = "123456789012"
  }
}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    app_name        = "vpn"
    instance_number = "01"
  }
  tags = {}

  aws = {
    region               = "eu-south-1"
    vpc_id               = "vpc-0123456789abcdef0"
    vpc_cidr             = "10.0.0.0/16"
    route_table_ids      = []
    private_subnet_ids   = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
    private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  }

  azure = {
    resource_group_name = "rg-test"
    location            = "italynorth"
    vnet_id             = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
    vnet_name           = "vnet-test"
    vnet_cidr           = "10.1.0.0/16"
    dns_forwarder_ip    = "10.1.1.4"
    private_dns_zones   = []
  }
}

run "aws_azure_vpn_development_keeps_bgp_enabled" {
  command = plan

  assert {
    condition     = azurerm_virtual_network_gateway.this[0].bgp_enabled
    error_message = "BGP must remain enabled on the created VPN gateway"
  }

  assert {
    condition     = azurerm_virtual_network_gateway_connection.tunnel1[0].bgp_enabled && azurerm_virtual_network_gateway_connection.tunnel2[0].bgp_enabled
    error_message = "BGP must remain enabled on both development VPN tunnels"
  }
}

run "aws_azure_vpn_high_availability_keeps_bgp_enabled" {
  command = plan

  variables {
    use_case = "high_availability"
  }

  assert {
    condition     = azurerm_virtual_network_gateway.this[0].bgp_enabled && azurerm_virtual_network_gateway.this[0].active_active
    error_message = "The high-availability gateway must preserve BGP and active-active mode"
  }

  assert {
    condition     = length(azurerm_virtual_network_gateway_connection.tunnel1) == 2 && length(azurerm_virtual_network_gateway_connection.tunnel2) == 2 && alltrue([for tunnel in concat(azurerm_virtual_network_gateway_connection.tunnel1, azurerm_virtual_network_gateway_connection.tunnel2) : tunnel.bgp_enabled])
    error_message = "BGP must remain enabled on all four high-availability tunnels"
  }
}

run "aws_azure_vpn_existing_gateway_keeps_bgp_enabled" {
  command = plan

  variables {
    azure = {
      resource_group_name = "rg-test"
      location            = "italynorth"
      vnet_id             = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
      vnet_name           = "vnet-test"
      vnet_cidr           = "10.1.0.0/16"
      dns_forwarder_ip    = "10.1.1.4"
      private_dns_zones   = []
      vpn = {
        virtual_network_gateway_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworkGateways/existing-vpn"
        public_ips                 = ["203.0.113.1"]
      }
    }
  }

  assert {
    condition     = length(azurerm_virtual_network_gateway.this) == 0
    error_message = "An existing gateway must not be recreated"
  }

  assert {
    condition     = azurerm_virtual_network_gateway_connection.tunnel1[0].bgp_enabled && azurerm_virtual_network_gateway_connection.tunnel2[0].bgp_enabled
    error_message = "BGP must remain enabled when attaching tunnels to an existing gateway"
  }
}
