module "azure" {
  # source  = "pagopa-dx/azure-core-infra/azurerm"
  # version = "~> 2.0"
  source = "../../modules/azure_core_infra"

  environment = local.azure_environment

  nat_enabled     = false
  vpn_enabled     = true
  test_enabled    = true
  aws_vpn_enabled = true

  cross_cloud_dns_enabled = true

  cross_cloud_dns_config = {
    aws_coredns_ip = "10.0.3.123"
    aws_vpc_cidr   = local.aws.vpc_cidr
  }

  virtual_network_cidr = local.azure.vnet_cidr

  tags = local.tags
}

module "aws" {
  # source  = "pagopa-dx/aws-core-infra/aws"
  # version = "~> 0.0"
  source = "../../modules/aws_core_infra"

  environment       = local.aws_environment
  vpc_cidr          = local.aws.vpc_cidr
  nat_gateway_count = 0

  cross_cloud_dns_enabled = true
  dns_forwarder_static_ip = "10.0.3.123"

  cross_cloud_dns_config = {
    azure_coredns_ip = module.azure.dns_forwarder.private_ip
    azure_vnet_cidr  = "10.51.0.0/16"
  }

  tags = local.tags
}

module "vpn" {
  source = "../../modules/aws_azure_vpn"

  environment = {
    prefix          = local.azure_environment.prefix
    env_short       = local.azure_environment.env_short
    app_name        = "core"
    instance_number = "01"
  }

  use_case = "default"

  aws = {
    region              = local.aws_environment.region
    vpc_id              = module.aws.vpc_id
    vpc_cidr            = local.aws.vpc_cidr
    route_table_ids     = concat(module.aws.private_route_table_ids, module.aws.isolated_route_table_ids)
    isolated_subnet_ids = module.aws.isolated_subnet_ids
  }

  azure = {
    resource_group_name = module.azure.network_resource_group_name
    location            = local.azure_environment.location
    vnet_id             = module.azure.common_vnet.id
    vnet_name           = module.azure.common_vnet.name
    vnet_cidr           = local.azure.vnet_cidr
    vpn_snet_id         = module.azure.common_vpn_snet.id
    dns_forwarder_ip    = module.azure.dns_forwarder.private_ip
    vpn = {
      virtual_network_gateway_id = module.azure.vpn_gateway_id
      public_ips                 = module.azure.vpn_public_ips
    }
    private_dns_zones = module.azure.private_dns_zones
  }

  tags = local.tags
}