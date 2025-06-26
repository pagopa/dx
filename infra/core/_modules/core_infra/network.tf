module "cidrs" {
  source = "hashicorp/subnets/cidr"
  version = "~> 1.0"

  base_cidr_block = var.virtual_network_cidr
  networks = [
    {
      name     = "pep"
      new_bits = 7
    },
    {
      name     = "gh_runner"
      new_bits = 8
    },
    {
      name     = "vpn"
      new_bits = 8
    },
    {
      name     = "vpn_dnsforwarder"
      new_bits = 13
    }
  ]
}
