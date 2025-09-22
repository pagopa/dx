# Security Group for CoreDNS
resource "aws_security_group" "coredns" {
  count = var.use_case == "development" ? 1 : 0
  name = provider::awsdx::resource_name(merge(local.aws_naming_config, {
    name          = "coredns-instance"
    resource_type = "security_group"
  }))
  vpc_id      = var.aws.vpc_id
  description = "Security group for CoreDNS forwarder"

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

  # SSH access from VPC (for troubleshooting)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.aws.vpc_cidr]
    description = "SSH from VPC"
  }

  # DNS outbound traffic to specific targets
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.azure.vnet_cidr]
    description = "DNS UDP to Azure VNet"
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.azure.vnet_cidr]
    description = "DNS TCP to Azure VNet"
  }

  # DNS to VPC resolver
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.aws.vpc_cidr]
    description = "DNS UDP to VPC resolver"
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.aws.vpc_cidr]
    description = "DNS TCP to VPC resolver"
  }

  # HTTPS for SSM, CloudWatch and package downloads
  # trivy:ignore:AVD-AWS-0104 Required for AWS services and package management
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for AWS services and package downloads"
  }

  # HTTP for package downloads (required for dnf/yum)
  # trivy:ignore:AVD-AWS-0104 Required for Linux package repository access
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP for package downloads"
  }

  tags = local.tags
}

# IAM role for EC2 instance
resource "aws_iam_role" "coredns" {
  count = var.use_case == "development" ? 1 : 0
  name = provider::awsdx::resource_name(merge(local.aws_naming_config, {
    name          = "coredns-instance"
    resource_type = "iam_role"
  }))

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

  tags = local.tags
}

# IAM instance profile
resource "aws_iam_instance_profile" "coredns" {
  count       = var.use_case == "development" ? 1 : 0
  name_prefix = aws_iam_role.coredns[0].name
  role        = aws_iam_role.coredns[0].name

  tags = local.tags
}

# IAM policy for CloudWatch logs (optional)
resource "aws_iam_role_policy" "coredns_cloudwatch" {
  count = var.use_case == "development" ? 1 : 0
  name_prefix = provider::awsdx::resource_name(merge(local.aws_naming_config, {
    name          = "coredns-instance-cloudwatch"
    resource_type = "iam_role_policy"
  }))
  role = aws_iam_role.coredns[0].id

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

# Attach SSM managed policy for Session Manager access
resource "aws_iam_role_policy_attachment" "coredns_ssm" {
  count      = var.use_case == "development" ? 1 : 0
  role       = aws_iam_role.coredns[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_network_interface" "coredns" {
  count             = var.use_case == "development" ? 1 : 0
  subnet_id         = var.aws.private_subnet_ids[0]
  private_ips       = [local.aws_dns_forwarder_static_ip]
  security_groups   = [aws_security_group.coredns[0].id]
  source_dest_check = false
  tags = merge(local.tags, {
    Name = provider::awsdx::resource_name(merge(local.aws_naming_config, {
      name          = "coredns-instance"
      resource_type = "network_interface"
    }))
  })
}
resource "aws_instance" "coredns" {
  count                       = var.use_case == "development" ? 1 : 0
  ami                         = data.aws_ami.amazon_linux[0].id
  instance_type               = "t3.micro"
  iam_instance_profile        = aws_iam_instance_profile.coredns[0].name
  user_data                   = local.user_data
  user_data_replace_on_change = true

  # Require IMDSv2 for enhanced security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  network_interface {
    network_interface_id = aws_network_interface.coredns[0].id
    device_index         = 0
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  tags = merge(local.tags, {
    Name = provider::awsdx::resource_name(merge(local.aws_naming_config, {
      name          = "coredns-instance"
      resource_type = "ec2_instance"
    }))
    Type = "DNS-Forwarder"
  })
}

