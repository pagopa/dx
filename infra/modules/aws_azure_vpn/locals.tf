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
    default           = { vpn_connections_number = 1 }
    high_availability = { vpn_connections_number = 2 }
  }

  #########
  #  AWS  #
  #########

  aws_region_short = {
    "eu-west-1"  = "eu"
    "eu-south-1" = "eus1"
  }

  aws = {
    bgp_asn = 65000
    name    = "${var.environment.prefix}-${var.environment.env_short}-${local.aws_region_short[var.aws.region]}-awsvpn-${var.environment.instance_number}"
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
    bgp_asn = 64512
    name    = "${var.environment.prefix}-${var.environment.env_short}-${local.azure_location_short[var.azure.location]}-awsvpn-${var.environment.instance_number}"
  }

  azure_naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.azure.location,
    instance_number = tonumber(var.environment.instance_number),
    name            = "${var.environment.app_name}-vpn"
  }

  azure_inbound_ip_addresses = var.use_case == "high_availability" ? [for obj in azurerm_private_dns_resolver_inbound_endpoint.main[0].ip_configurations : obj.private_ip_address] : [var.azure.dns_forwarder_ip]

  azure_location_short = {
    "westeurope" = "weu"
    "italynorth" = "itn"
  }
}
