# AWS Client VPN Endpoint for point-to-site VPN connectivity
# This provides secure remote access to the VPC for authorized users

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Client VPN Endpoint
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "Client VPN endpoint for ${var.naming_config.prefix}-${var.naming_config.environment}"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = var.client_cidr_block

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client.arn
  }

  connection_log_options {
    enabled = false
  }

  dns_servers = [cidrhost(var.vpc_cidr, 2)] # Use VPC DNS resolver

  tags = merge(var.tags, {
    Name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-vpn-endpoint${var.naming_config.instance_number}"
  })
}

# Associate VPN endpoint with target network (first public subnet)
resource "aws_ec2_client_vpn_network_association" "main" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = var.public_subnet_ids[0]

  lifecycle {
    ignore_changes = [subnet_id]
  }
}

# Authorization rule to allow access to VPC
resource "aws_ec2_client_vpn_authorization_rule" "vpc_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = var.vpc_cidr
  authorize_all_groups   = true
  description            = "Allow access to VPC"
}

# Authorization rule to allow internet access
resource "aws_ec2_client_vpn_authorization_rule" "internet_access" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = "0.0.0.0/0"
  authorize_all_groups   = true
  description            = "Allow internet access"
}

# Route for VPC access
resource "aws_ec2_client_vpn_route" "vpc_route" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  destination_cidr_block = var.vpc_cidr
  target_vpc_subnet_id   = var.public_subnet_ids[0]
  description            = "Route to VPC"
}

# Route for internet access
resource "aws_ec2_client_vpn_route" "internet_route" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  destination_cidr_block = "0.0.0.0/0"
  target_vpc_subnet_id   = var.public_subnet_ids[0]
  description            = "Route to internet"
}

# Self-signed certificate for VPN server
resource "aws_acm_certificate" "vpn_server" {
  private_key      = tls_private_key.vpn_server.private_key_pem
  certificate_body = tls_self_signed_cert.vpn_server.cert_pem

  tags = merge(var.tags, {
    Name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-vpn-server-cert${var.naming_config.instance_number}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Self-signed certificate for VPN client
resource "aws_acm_certificate" "vpn_client" {
  private_key      = tls_private_key.vpn_client.private_key_pem
  certificate_body = tls_self_signed_cert.vpn_client.cert_pem

  tags = merge(var.tags, {
    Name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-vpn-client-cert${var.naming_config.instance_number}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Private key for VPN server certificate
resource "tls_private_key" "vpn_server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Private key for VPN client certificate
resource "tls_private_key" "vpn_client" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Self-signed certificate for VPN server
resource "tls_self_signed_cert" "vpn_server" {
  private_key_pem = tls_private_key.vpn_server.private_key_pem

  subject {
    common_name         = "${var.naming_config.prefix}-${var.naming_config.environment}-vpn-server"
    organization        = "PagoPA"
    organizational_unit = "DevEx"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

# Self-signed certificate for VPN client
resource "tls_self_signed_cert" "vpn_client" {
  private_key_pem = tls_private_key.vpn_client.private_key_pem

  subject {
    common_name         = "${var.naming_config.prefix}-${var.naming_config.environment}-vpn-client"
    organization        = "PagoPA"
    organizational_unit = "DevEx"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "client_auth",
  ]
}
