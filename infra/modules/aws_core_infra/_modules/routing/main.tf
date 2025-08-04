# Routing module for AWS Core Infrastructure
# Creates route tables and routes for public and private subnets

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = var.vpc_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = var.internet_gateway_id
  }

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name          = "public"
      resource_type = "route_table"
    }))
    Type = "Public"
  })
}

# Public Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_ids)

  subnet_id      = var.public_subnet_ids[count.index]
  route_table_id = aws_route_table.public.id
}

# Private Route Tables (one per AZ for NAT Gateway routing)
resource "aws_route_table" "private" {
  count = length(var.private_subnet_ids)

  vpc_id = var.vpc_id

  # Only add NAT Gateway route if NAT Gateways are enabled
  dynamic "route" {
    for_each = length(var.nat_gateway_ids) > 0 ? [1] : []
    content {
      cidr_block = "0.0.0.0/0"
      # Use modulo to distribute subnets across available NAT gateways
      nat_gateway_id = var.nat_gateway_ids[count.index % length(var.nat_gateway_ids)]
    }
  }

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name            = "private"
      resource_type   = "route_table"
      instance_number = tostring(var.naming_config.instance_number + count.index)
    }))
    Type = "Private"
  })
}

# Private Route Table Associations
resource "aws_route_table_association" "private" {
  count = length(var.private_subnet_ids)

  subnet_id      = var.private_subnet_ids[count.index]
  route_table_id = aws_route_table.private[count.index].id
}

# Isolated Route Tables (completely isolated - no routes to internet)
resource "aws_route_table" "isolated" {
  count = length(var.isolated_subnet_ids)

  vpc_id = var.vpc_id

  # No routes to internet - completely isolated

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name            = "isolated"
      resource_type   = "route_table"
      instance_number = tostring(var.naming_config.instance_number + count.index)
    }))
    Type = "Isolated"
  })
}

# Isolated Route Table Associations
resource "aws_route_table_association" "isolated" {
  count = length(var.isolated_subnet_ids)

  subnet_id      = var.isolated_subnet_ids[count.index]
  route_table_id = aws_route_table.isolated[count.index].id
}
