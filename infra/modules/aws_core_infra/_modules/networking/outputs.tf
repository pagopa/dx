output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnets" {
  description = "Map of public subnet details"
  value = {
    for i, subnet in aws_subnet.public : i => {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      arn               = subnet.arn
    }
  }
}

output "private_subnets" {
  description = "Map of private subnet details"
  value = {
    for i, subnet in aws_subnet.private : i => {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      arn               = subnet.arn
    }
  }
}

output "isolated_subnet_ids" {
  description = "IDs of the isolated subnets"
  value       = aws_subnet.isolated[*].id
}

output "isolated_subnets" {
  description = "Map of isolated subnet details"
  value = {
    for i, subnet in aws_subnet.isolated : i => {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      arn               = subnet.arn
    }
  }
}
