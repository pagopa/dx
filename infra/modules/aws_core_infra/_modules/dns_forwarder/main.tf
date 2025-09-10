terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for CoreDNS
resource "aws_security_group" "coredns" {
  name_prefix = "${var.project}-coredns-"
  vpc_id      = var.vpc_id
  description = "Security group for CoreDNS forwarder"

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

  # SSH access from VPC (for troubleshooting)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "SSH from VPC"
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
    Name = "${var.project}-coredns-sg"
  })
}

# IAM role for EC2 instance
resource "aws_iam_role" "coredns" {
  name_prefix = "${var.project}-coredns-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM instance profile
resource "aws_iam_instance_profile" "coredns" {
  name_prefix = "${var.project}-coredns-"
  role        = aws_iam_role.coredns.name

  tags = var.tags
}

# IAM policy for CloudWatch logs (optional)
resource "aws_iam_role_policy" "coredns_cloudwatch" {
  name_prefix = "${var.project}-coredns-cloudwatch-"
  role        = aws_iam_role.coredns.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ec2/coredns*"
      }
    ]
  })
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# User data script to install and configure CoreDNS
locals {
  vpc_dns_ip = cidrhost(var.vpc_cidr, 2)

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    vpc_dns_ip       = local.vpc_dns_ip
    azure_coredns_ip = var.cross_cloud_dns_config.azure_coredns_ip
    region           = data.aws_region.current.name
  }))
}

# EC2 instance for CoreDNS
resource "aws_instance" "coredns" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.coredns.id]
  iam_instance_profile   = aws_iam_instance_profile.coredns.name

  private_ip                  = var.static_private_ip != "" ? var.static_private_ip : cidrhost(data.aws_subnet.target.cidr_block, 100)
  source_dest_check           = false
  associate_public_ip_address = false

  user_data = local.user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  tags = merge(var.tags, {
    Name = "${var.project}-coredns"
    Type = "DNS-Forwarder"
  })

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_subnet" "target" {
  id = var.subnet_id
}
