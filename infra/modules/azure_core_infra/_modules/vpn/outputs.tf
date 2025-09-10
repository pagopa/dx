output "gateway_id" {
  description = "The ID of the virtual network gateway."
  value       = azurerm_virtual_network_gateway.this.id
}

output "fqdns" {
  description = "The FQDNs for the gateway."
  value       = [for pip in azurerm_public_ip.this : pip.fqdn]
}

output "public_ips" {
  description = "The public IP addresses associated with the gateway."
  value       = [for pip in azurerm_public_ip.this : pip.ip_address]
}

output "dns_forwarder_endpoint" {
  description = "DNS forwarder endpoint"
  value       = module.dns_forwarder.dns_forwarder_endpoint
}

output "dns_forwarder_private_ip" {
  description = "DNS forwarder private IP address"
  value       = module.dns_forwarder.dns_forwarder_private_ip
}
