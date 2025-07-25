output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IP addresses assigned to the NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}
