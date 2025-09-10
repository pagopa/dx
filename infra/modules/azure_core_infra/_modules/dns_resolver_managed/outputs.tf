output "private_dns_resolver_id" {
  description = "Azure Private DNS Resolver ID"
  value       = azurerm_private_dns_resolver.main.id
}

output "inbound_endpoint_id" {
  description = "Private DNS Resolver inbound endpoint ID"
  value       = azurerm_private_dns_resolver_inbound_endpoint.main.id
}

output "inbound_endpoint_ip" {
  description = "Private DNS Resolver inbound endpoint IP address"
  value       = azurerm_private_dns_resolver_inbound_endpoint.main.ip_configurations[0].private_ip_address
}

output "outbound_endpoint_id" {
  description = "Private DNS Resolver outbound endpoint ID"
  value       = azurerm_private_dns_resolver_outbound_endpoint.main.id
}

output "dns_forwarding_ruleset_id" {
  description = "DNS forwarding ruleset ID"
  value       = azurerm_private_dns_resolver_dns_forwarding_ruleset.aws.id
}

output "forwarding_rule_ids" {
  description = "Map of domain names to forwarding rule IDs"
  value       = { for k, v in azurerm_private_dns_resolver_forwarding_rule.aws_domains : k => v.id }
}
