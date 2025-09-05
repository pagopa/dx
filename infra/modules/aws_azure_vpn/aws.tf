resource "aws_vpn_gateway" "this" {
  vpc_id = var.aws.vpc_id

  tags = var.tags
}

resource "aws_customer_gateway" "this" {
  count      = local.use_cases[var.use_case].vpn_connections_number
  ip_address = length(var.azure.vpn.public_ips) == 0 ? azurerm_public_ip.this[count.index].ip_address : var.azure.vpn.public_ips[count.index]
  bgp_asn    = local.aws.bgp_asn
  type       = "ipsec.1"

  tags = merge({
    Name = provider::awsdx::resource_name(merge(local.naming_config, {
      name          = "${local.naming_config.name}-${count.index + 1}"
      resource_type = "customer_gateway"
    }))
  }, var.tags)

  depends_on = [
    time_sleep.wait_public_ips
  ]
}

resource "aws_vpn_connection" "this" {
  count               = local.use_cases[var.use_case].vpn_connections_number
  vpn_gateway_id      = aws_vpn_gateway.this.id
  customer_gateway_id = aws_customer_gateway.this[count.index].id
  type                = "ipsec.1"

  tunnel1_inside_cidr = local.aws.inside_cidrs[count.index][0]
  tunnel2_inside_cidr = local.aws.inside_cidrs[count.index][1]

  tags = merge({
    Name = provider::awsdx::resource_name(merge(local.naming_config, {
      name          = "${local.naming_config.name}-${count.index + 1}"
      resource_type = "vpn_connection"
    }))
  }, var.tags)
}

#---------#
# Routing #
#---------#

# Routes to Azure networks through VPN gateway
resource "aws_vpn_gateway_route_propagation" "this" {
  count          = length(var.aws.route_table_ids)
  route_table_id = var.aws.route_table_ids[count.index]
  vpn_gateway_id = aws_vpn_gateway.this.id
}
