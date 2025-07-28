# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      domain        = ""
      name          = "core"
      resource_type = "vpc"
    }))
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      domain        = ""
      name          = "core"
      resource_type = "internet_gateway"
    }))
  })
}

# VPC Flow Logs (conditional)
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination_type == "cloud-watch-logs" ? 1 : 0

  name              = "/aws/vpc/flowlogs"
  retention_in_days = 3

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name          = "vpc-flow-logs"
      resource_type = "cloudwatch_log_group"
    }))
  })
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination_type == "cloud-watch-logs" ? 1 : 0

  name = provider::dx::resource_name(merge(var.naming_config, {
    name          = "vpc-flow-logs"
    resource_type = "iam_role"
  }))

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Role Policy for VPC Flow Logs
resource "aws_iam_role_policy" "vpc_flow_logs" {
  count = var.enable_flow_logs && var.flow_logs_destination_type == "cloud-watch-logs" ? 1 : 0

  name = "vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# VPC Flow Logs
resource "aws_flow_log" "vpc" {
  count = var.enable_flow_logs ? 1 : 0

  iam_role_arn    = var.flow_logs_destination_type == "cloud-watch-logs" ? aws_iam_role.vpc_flow_logs[0].arn : null
  log_destination = var.flow_logs_destination_type == "cloud-watch-logs" ? aws_cloudwatch_log_group.vpc_flow_logs[0].arn : null
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = var.tags
}
