output "dns_forwarder_endpoint" {
  description = "DNS forwarder endpoint"
  value       = module.dns_forwarder.dns_forwarder_endpoint
}

output "dns_forwarder_private_ip" {
  description = "DNS forwarder private IP address"
  value       = module.dns_forwarder.dns_forwarder_private_ip
}
