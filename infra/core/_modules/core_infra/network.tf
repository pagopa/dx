module "cidrs" {
  source  = "hashicorp/subnets/cidr"
  version = "~> 1.0"

  base_cidr_block = var.virtual_network_cidr
  networks        = local.networks
}
