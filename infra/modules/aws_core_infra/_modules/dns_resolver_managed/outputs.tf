output "inbound_endpoint_id" {
  description = "Route53 Resolver inbound endpoint ID"
  value       = aws_route53_resolver_endpoint.inbound.id
}

output "inbound_endpoint_ips" {
  description = "Route53 Resolver inbound endpoint IP addresses"
  value       = aws_route53_resolver_endpoint.inbound.ip_address[*].ip
}

output "outbound_endpoint_id" {
  description = "Route53 Resolver outbound endpoint ID"
  value       = aws_route53_resolver_endpoint.outbound.id
}

output "outbound_endpoint_ips" {
  description = "Route53 Resolver outbound endpoint IP addresses"
  value       = aws_route53_resolver_endpoint.outbound.ip_address[*].ip
}

output "security_group_id" {
  description = "Security group ID for Route53 Resolver endpoints"
  value       = aws_security_group.resolver.id
}

output "resolver_rule_ids" {
  description = "Map of domain names to resolver rule IDs"
  value       = { for k, v in aws_route53_resolver_rule.azure_zones : k => v.id }
}

output "query_log_config_id" {
  description = "Route53 Resolver query log configuration ID"
  value       = aws_route53_resolver_query_log_config.main.id
}
