locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/package.json")).name, "unknown")
    }
  )

  use_cases = {
    development       = { vpn_connections_number = 1 }
    high_availability = { vpn_connections_number = (var.azure.vpn.virtual_network_gateway_id == null ? 2 : length(var.azure.vpn.public_ips)) }
  }

  #########
  #  AWS  #
  #########

  aws = {
    bgp_asn = var.aws.asn
    # First level key is the VPN connection index, second level key is the tunnel index
    inside_cidrs = {
      0 = {
        0 = "169.254.21.0/30"
        1 = "169.254.22.0/30"
      },
      1 = {
        0 = "169.254.21.4/30"
        1 = "169.254.22.4/30"
      }
    }
    dns_resolver_subnet_ids = slice(var.aws.private_subnet_ids, 0, 2)
  }

  aws_naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    region          = var.aws.region,
    instance_number = tonumber(var.environment.instance_number),
    name            = "${var.environment.app_name}-vpn"
  }

  aws_dns_forwarder_static_ip = cidrhost(var.aws.private_subnet_cidrs[0], 123)
  aws_inbound_ip_addresses    = var.use_case == "high_availability" ? [for obj in aws_route53_resolver_endpoint.inbound[0].ip_address : obj.ip] : [local.aws_dns_forwarder_static_ip]

  aws_vpc_dns_ip = cidrhost(var.aws.vpc_cidr, 2)

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh", {
    vpc_dns_ip = local.aws_vpc_dns_ip
    region     = data.aws_region.current.name
  }))


  #########
  # Azure #
  #########
  azure = {
    bgp_asn = var.azure.asn
  }

  azure_naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.azure.location,
    instance_number = tonumber(var.environment.instance_number),
    name            = "${var.environment.app_name}-vpn"
  }

  azure_inbound_ip_addresses = var.use_case == "high_availability" ? [for obj in azurerm_private_dns_resolver_inbound_endpoint.main[0].ip_configurations : obj.private_ip_address] : [var.azure.dns_forwarder_ip]
}
