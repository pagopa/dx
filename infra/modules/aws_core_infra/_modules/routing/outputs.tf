output "public_route_table_ids" {
  description = "IDs of the public route tables"
  value       = [aws_route_table.public.id]
}

output "private_route_table_ids" {
  description = "IDs of the private route tables"
  value       = aws_route_table.private[*].id
}

output "isolated_route_table_ids" {
  description = "IDs of the isolated route tables"
  value       = aws_route_table.isolated[*].id
}
