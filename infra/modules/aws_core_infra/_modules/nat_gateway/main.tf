# NAT Gateway module for AWS Core Infrastructure
# Creates NAT Gateways and Elastic IPs for private subnet internet access

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.nat_gateway_count

  domain = "vpc"

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name            = "eip-nat"
      resource_type   = "elastic_ip"
      instance_number = tostring(var.naming_config.instance_number + count.index)
    }))
  })
}

# NAT Gateways (configurable number for cost optimization)
resource "aws_nat_gateway" "main" {
  count = var.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = var.public_subnet_ids[count.index]

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name            = "network"
      resource_type   = "nat_gateway"
      instance_number = tostring(var.naming_config.instance_number + count.index)
    }))
  })

  depends_on = [aws_eip.nat]
}
