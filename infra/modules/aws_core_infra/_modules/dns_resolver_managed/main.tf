terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Security Group for Route53 Resolver endpoints
resource "aws_security_group" "resolver" {
  name_prefix = "${var.project}-route53-resolver-"
  vpc_id      = var.vpc_id
  description = "Security group for Route53 Resolver endpoints"

  # DNS traffic from VPC
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
    description = "DNS UDP from VPC"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "DNS TCP from VPC"
  }

  # DNS traffic from Azure VNet over VPN
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.cross_cloud_dns_config.azure_vnet_cidr]
    description = "DNS UDP from Azure VNet"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.cross_cloud_dns_config.azure_vnet_cidr]
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
    Name = "${var.project}-route53-resolver-sg"
  })
}

# Route53 Resolver Inbound Endpoint
# This allows Azure resources to query AWS private DNS zones
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "${var.project}-resolver-inbound"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  dynamic "ip_address" {
    for_each = var.subnet_ids
    content {
      subnet_id = ip_address.value
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project}-resolver-inbound"
    Type = "Inbound"
  })
}

# Route53 Resolver Outbound Endpoint  
# This allows AWS resources to query Azure private DNS zones
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "${var.project}-resolver-outbound"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  dynamic "ip_address" {
    for_each = var.subnet_ids
    content {
      subnet_id = ip_address.value
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project}-resolver-outbound"
    Type = "Outbound"
  })
}

# Route53 Resolver Rules for forwarding Azure queries
# Forward common Azure private DNS zone patterns to Azure Private DNS Resolver
resource "aws_route53_resolver_rule" "azure_zones" {
  for_each = toset([
    "azure",
    "internal.azure",
    "privatelink.azure.com",
    "azurewebsites.net",
    "database.azure.com",
    "documents.azure.com",
    "servicebus.windows.net",
    "blob.core.windows.net",
    "file.core.windows.net",
    "queue.core.windows.net",
    "table.core.windows.net",
    "redis.cache.windows.net",
    "postgres.database.azure.com"
  ])

  domain_name          = each.value
  name                 = "${var.project}-resolver-rule-${replace(each.value, ".", "-")}"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip = var.cross_cloud_dns_config.azure_resolver_inbound_ip
  }

  tags = merge(var.tags, {
    Name   = "${var.project}-resolver-rule-${replace(each.value, ".", "-")}"
    Domain = each.value
  })
}

# Associate resolver rules with VPC
resource "aws_route53_resolver_rule_association" "azure_zones" {
  for_each = aws_route53_resolver_rule.azure_zones

  resolver_rule_id = each.value.id
  vpc_id           = var.vpc_id
}

# CloudWatch Log Group for Query Logging (optional)
resource "aws_cloudwatch_log_group" "resolver_query_logs" {
  name              = "/aws/route53resolver/${var.project}"
  retention_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project}-resolver-query-logs"
  })
}

# Route53 Resolver Query Logging Configuration
resource "aws_route53_resolver_query_log_config" "main" {
  name            = "${var.project}-resolver-query-logs"
  destination_arn = aws_cloudwatch_log_group.resolver_query_logs.arn

  tags = merge(var.tags, {
    Name = "${var.project}-resolver-query-logs"
  })
}

# Associate Query Logging with VPC
resource "aws_route53_resolver_query_log_config_association" "main" {
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.main.id
  resource_id                  = var.vpc_id
}
