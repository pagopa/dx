# This example demonstrates a complete AWS-Azure VPN setup with high availability configuration.
# It creates all necessary resources including VPCs, VNets, and VPN connections.

#=============================#
# AWS Provider and Resources  #
#=============================#

# VPC
# trivy:ignore:AVD-AWS-0178 VPC Flow Logs disabled intentionally for cost optimization
resource "aws_vpc" "example" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, {
    Name = "dx-d-eus1-vpc-vpn-example-01"
  })
}

# Create private subnets in the AWS VPC
resource "aws_subnet" "example_private" {
  count = 2

  vpc_id            = aws_vpc.example.id
  cidr_block        = "10.1.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.tags, {
    Name = "dx-d-eus1-subnet-vpn-private-${count.index + 1}-01"
    Type = "Private"
  })
}

# Route table for AWS private subnets
resource "aws_route_table" "example_private" {
  vpc_id = aws_vpc.example.id

  tags = merge(local.tags, {
    Name = "dx-d-eus1-rt-vpn-private-01"
  })
}

# Associate private subnets with route table
resource "aws_route_table_association" "example_private" {
  count = length(aws_subnet.example_private)

  subnet_id      = aws_subnet.example_private[count.index].id
  route_table_id = aws_route_table.example_private.id
}

#===============================#
# Azure Provider and Resources  #
#===============================#

# Create Azure Resource Group
resource "azurerm_resource_group" "example" {
  name     = "dx-d-itn-rg-vpn-example-01"
  location = local.azure_location

  tags = local.tags
}

# Create Azure Virtual Network
resource "azurerm_virtual_network" "example" {
  name                = "dx-d-itn-vnet-vpn-example-01"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  address_space       = ["10.2.0.0/16"]

  tags = local.tags
}

# Create Gateway Subnet (required for VPN Gateway)
resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.2.255.0/27"]
}

# Create a regular subnet for workloads
resource "azurerm_subnet" "workload" {
  name                 = "dx-d-itn-subnet-vpn-workload-01"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.2.1.0/24"]
}

#======================#
# AWS-Azure VPN Module #
#======================#

module "aws_azure_vpn" {
  source = "../../"

  environment = local.environment
  use_case    = "high_availability" # Demonstrates high availability setup

  # AWS Configuration
  aws = {
    region          = local.aws_region
    vpc_id          = aws_vpc.example.id
    route_table_ids = [aws_route_table.example_private.id]
  }

  # Azure Configuration
  azure = {
    resource_group_name = azurerm_resource_group.example.name
    location            = azurerm_resource_group.example.location
    vnet_id             = azurerm_virtual_network.example.id
    vnet_name           = azurerm_virtual_network.example.name
    vpn_snet_id         = azurerm_subnet.gateway.id
    vpn = {
      virtual_network_gateway_id = null # Will create new VPN gateway
      public_ips                 = []   # Will create new public IPs
    }
  }

  # Routing Configuration
  routing = {
    create_routes = true
    # AWS routing is REQUIRED - AWS doesn't auto-propagate VPN routes
    aws = {
      route_table_ids = [aws_route_table.example_private.id]
      azure_cidrs     = azurerm_virtual_network.example.address_space
    }
    # Azure routing is automatically handled by BGP - no configuration needed
  }

  tags = local.tags
}
