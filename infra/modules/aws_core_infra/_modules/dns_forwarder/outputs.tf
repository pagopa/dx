output "coredns_instance_id" {
  description = "EC2 instance ID of the CoreDNS forwarder"
  value       = aws_instance.coredns.id
}

output "coredns_private_ip" {
  description = "Private IP address of the CoreDNS forwarder"
  value       = aws_instance.coredns.private_ip
}

output "security_group_id" {
  description = "Security group ID for the CoreDNS forwarder"
  value       = aws_security_group.coredns.id
}

output "coredns_endpoint" {
  description = "DNS endpoint for CoreDNS forwarder"
  value       = "${aws_instance.coredns.private_ip}:53"
}
