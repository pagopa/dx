locals {
  use_cases = {
    "default" = {
      generation             = "1"
      sku                    = "VpnGw1"
      vpn_connections_number = 1
    }
    "high_availability" = {
      generation             = "2"
      sku                    = "VpnGw2"
      vpn_connections_number = 2
    }
  }

  aws = {
    bgp_asn = 65000
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
  }

  corefile_content = <<EOF
.:53 {
  errors
  ready
  health
  forward . 168.63.129.16
  cache 30
  loop
  reload
}
EOF
}
