output "client_vpn_endpoint_id" {
  description = "The ID of the Client VPN endpoint"
  value       = aws_ec2_client_vpn_endpoint.main.id
}

output "client_vpn_endpoint_dns_name" {
  description = "The DNS name of the Client VPN endpoint"
  value       = aws_ec2_client_vpn_endpoint.main.dns_name
}

output "vpn_server_certificate_arn" {
  description = "ARN of the VPN server certificate"
  value       = aws_acm_certificate.vpn_server.arn
}

output "vpn_client_certificate_arn" {
  description = "ARN of the VPN client certificate"
  value       = aws_acm_certificate.vpn_client.arn
}

output "vpn_client_configuration" {
  description = "VPN client configuration download URL"
  value       = aws_ec2_client_vpn_endpoint.main.arn
}
