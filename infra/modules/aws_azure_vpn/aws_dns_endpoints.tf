# Security Group for Route53 Resolver endpoints
# trivy:ignore:AVD-AWS-0104 Opening up ports to connect out to the public internet is generally to be avoided. You should restrict access to IP addresses or ranges that are explicitly required where possible.
resource "aws_security_group" "resolver" {
  name = provider::awsdx::resource_name(merge(local.aws_naming_config, {
    name            = "route53-resolvers"
    resource_type   = "security_group"
    instance_number = local.aws_naming_config.instance_number
  }))
  vpc_id      = var.aws.vpc_id
  description = "Security group for Route53 Resolver endpoints"

  # DNS traffic from VPC
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.aws.vpc_cidr]
    description = "DNS UDP from VPC"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.aws.vpc_cidr]
    description = "DNS TCP from VPC"
  }

  # DNS traffic from Azure VNet over VPN
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.azure.vnet_cidr]
    description = "DNS UDP from Azure VNet"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.azure.vnet_cidr]
    description = "DNS TCP from Azure VNet"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "route53-resolver-sg"
  })
}

# Route53 Resolver Inbound Endpoint
# This allows Azure resources to query AWS private DNS zones
resource "aws_route53_resolver_endpoint" "inbound" {
  count     = var.use_case == "high_availability" ? 1 : 0
  name      = "resolver-inbound"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  dynamic "ip_address" {
    for_each = local.aws.dns_resolver_subnet_ids
    content {
      subnet_id = ip_address.value
    }
  }

  tags = merge(var.tags, {
    Name = "resolver-inbound"
    Type = "Inbound"
  })
}

# Route53 Resolver Outbound Endpoint  
# This allows AWS resources to query Azure private DNS zones
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "resolver-outbound"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  dynamic "ip_address" {
    for_each = local.aws.dns_resolver_subnet_ids
    content {
      subnet_id = ip_address.value
    }
  }

  tags = merge(var.tags, {
    Name = "resolver-outbound"
    Type = "Outbound"
  })
}

# Route53 Resolver Rules for forwarding Azure queries
# Forward common Azure private DNS zone patterns to Azure Private DNS Resolver
resource "aws_route53_resolver_rule" "azure_zones" {
  for_each = toset(var.azure.private_dns_zones)

  domain_name          = each.value
  name                 = "resolver-rule-${replace(each.value, ".", "-")}"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  dynamic "target_ip" {
    for_each = local.azure_inbound_ip_addresses
    content {
      ip = target_ip.value
    }
  }

  tags = merge(var.tags, {
    Name   = "resolver-rule-${replace(each.value, ".", "-")}"
    Domain = each.value
  })
}

# Associate resolver rules with VPC
resource "aws_route53_resolver_rule_association" "azure_zones" {
  for_each = aws_route53_resolver_rule.azure_zones

  resolver_rule_id = each.value.id
  vpc_id           = var.aws.vpc_id
}

# CloudWatch Log Group for Query Logging (optional)
# trivy:ignore:AVD-AWS-0017 CloudWatch log groups are encrypted by default, however, to get the full benefit of controlling key rotation and other KMS aspects a KMS CMK should be used.
resource "aws_cloudwatch_log_group" "resolver_query_logs" {
  count             = var.use_case == "high_availability" ? 1 : 0
  name              = "/aws/route53resolver/azurevpn"
  retention_in_days = 3

  tags = merge(var.tags, {
    Name = "resolver-query-logs"
  })
}

# Route53 Resolver Query Logging Configuration
resource "aws_route53_resolver_query_log_config" "main" {
  count           = var.use_case == "high_availability" ? 1 : 0
  name            = "resolver-query-logs"
  destination_arn = aws_cloudwatch_log_group.resolver_query_logs[0].arn

  tags = merge(var.tags, {
    Name = "resolver-query-logs"
  })
}

# Associate Query Logging with VPC
resource "aws_route53_resolver_query_log_config_association" "main" {
  count                        = var.use_case == "high_availability" ? 1 : 0
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.main[0].id
  resource_id                  = var.aws.vpc_id
}