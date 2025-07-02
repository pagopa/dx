locals {
  test_network = var.test_enabled ? [
    {
      name     = "test"
      new_bits = 8
    }
  ] : []

  networks = concat([
    {
      name     = "pep"
      new_bits = 7
    },
    {
      name     = "gh_runner"
      new_bits = 7
    },
    {
      name     = "vpn"
      new_bits = 8
    },
    {
      name     = "vpn_dnsforwarder"
      new_bits = 13
    }
  ], local.test_network)
}
