#-----#
# AWS #
#-----#

output "aws_vpn_gateway" {
  description = "AWS VPN Gateway details"
  value = {
    id  = aws_vpn_gateway.this.id
    arn = aws_vpn_gateway.this.arn
  }
}

output "aws_customer_gateways" {
  description = "AWS Customer Gateway details"
  value = {
    for idx, cgw in aws_customer_gateway.this : idx => {
      id         = cgw.id
      ip_address = cgw.ip_address
      bgp_asn    = cgw.bgp_asn
    }
  }
}

output "aws_vpn_connections" {
  description = "AWS VPN Connection details"
  value = {
    for idx, vpn in aws_vpn_connection.this : idx => {
      id                  = vpn.id
      customer_gateway_id = vpn.customer_gateway_id
      vpn_gateway_id      = vpn.vpn_gateway_id
      tunnel1_address     = vpn.tunnel1_address
      tunnel2_address     = vpn.tunnel2_address
      tunnel1_bgp_asn     = vpn.tunnel1_bgp_asn
      tunnel2_bgp_asn     = vpn.tunnel2_bgp_asn
    }
  }
}

#-------#
# Azure #
#-------#

output "azure_public_ips" {
  description = "Azure Public IP addresses for VPN Gateway"
  value = {
    for idx, pip in azurerm_public_ip.this : idx => {
      id         = pip.id
      ip_address = pip.ip_address
      fqdn       = pip.fqdn
    }
  }
}

output "azure_virtual_network_gateway" {
  description = "Azure Virtual Network Gateway details"
  value = var.azure.vpn.virtual_network_gateway_id == null ? {
    id      = azurerm_virtual_network_gateway.this[0].id
    name    = azurerm_virtual_network_gateway.this[0].name
    sku     = azurerm_virtual_network_gateway.this[0].sku
    bgp_asn = azurerm_virtual_network_gateway.this[0].bgp_settings[0].asn
    } : {
    id      = var.azure.vpn.virtual_network_gateway_id
    name    = "existing-gateway"
    sku     = "unknown"
    bgp_asn = "unknown"
  }
}

output "azure_local_network_gateways" {
  description = "Azure Local Network Gateway details"
  value = {
    tunnel1 = length(azurerm_local_network_gateway.tunnel1) > 0 ? {
      for idx, lng in azurerm_local_network_gateway.tunnel1 : idx => {
        id              = lng.id
        gateway_address = lng.gateway_address
        bgp_asn         = lng.bgp_settings[0].asn
      }
    } : {}
    tunnel2 = length(azurerm_local_network_gateway.tunnel2) > 0 ? {
      for idx, lng in azurerm_local_network_gateway.tunnel2 : idx => {
        id              = lng.id
        gateway_address = lng.gateway_address
        bgp_asn         = lng.bgp_settings[0].asn
      }
    } : {}
  }
}

output "azure_vpn_connections" {
  description = "Azure VPN Connection details"
  value = {
    tunnel1 = length(azurerm_virtual_network_gateway_connection.tunnel1) > 0 ? {
      for idx, conn in azurerm_virtual_network_gateway_connection.tunnel1 : idx => {
        id                = conn.id
        connection_status = conn.connection_status
      }
    } : {}
    tunnel2 = length(azurerm_virtual_network_gateway_connection.tunnel2) > 0 ? {
      for idx, conn in azurerm_virtual_network_gateway_connection.tunnel2 : idx => {
        id                = conn.id
        connection_status = conn.connection_status
      }
    } : {}
  }
}

#---------#
# General #
#---------#

output "vpn_configuration" {
  description = "VPN configuration summary"
  value = {
    use_case              = var.use_case
    vpn_connections_count = local.use_cases[var.use_case].vpn_connections_number
    aws_region            = var.aws.region
    azure_location        = var.azure.location
    bgp_configuration = {
      aws_asn   = local.aws.bgp_asn
      azure_asn = local.azure.bgp_asn
    }
  }
}
