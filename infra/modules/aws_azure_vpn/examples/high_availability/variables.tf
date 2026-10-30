variable "azure" {
  description = "Existing Azure foundation values. The VNet must contain GatewaySubnet (at least /27); use a fresh VNet without a DNS resolver because the VPN module creates one. Provision the foundation separately so v4-only modules do not constrain this v5 configuration."
  type = object({
    resource_group_name = string
    location            = string
    vnet_id             = string
    vnet_name           = string
    vnet_cidr           = string
    dns_forwarder_ip    = string
    asn                 = optional(number, 64512)
    vpn = optional(object({
      virtual_network_gateway_id = string
      public_ips                 = list(string)
    }), { virtual_network_gateway_id = null, public_ips = [] })
    private_dns_zones = list(string)
  })
}
