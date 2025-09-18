# DX - AWS Azure VPN Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/aws-azure-vpn/azurerm?logo=terraform&label=downloads&cacheSeconds=5000)

This Terraform module deploys a site-to-site VPN connection between an AWS VPC and an Azure Virtual Network, enabling secure network communication between cloud environments. The module supports both standard and high-availability configurations.

## Features

- **Site-to-Site VPN**: Establishes secure IPsec tunnels between AWS and Azure
- **High Availability**: Optional dual-tunnel configuration for redundancy
- **BGP Support**: Dynamic routing with Border Gateway Protocol
- **Flexible Gateway Configuration**: Can use existing Azure Virtual Network Gateway or create a new one
- **Multi-Region Support**: Supports various AWS and Azure regions with automatic naming conventions
- **Comprehensive Security**: IPsec encryption with configurable BGP ASN values

## Architecture

The module creates the following resources:

### AWS Side

- **VPN Gateway**: Attached to the specified AWS VPC
- **Customer Gateway(s)**: Represents the Azure side endpoint(s)
- **VPN Connection(s)**: IPsec tunnels with BGP configuration

### Azure Side

- **Public IP(s)**: Static IPs for the VPN gateway
- **Virtual Network Gateway**: Route-based VPN gateway (optional, if not provided)
- **Local Network Gateway(s)**: Represents the AWS side endpoint(s)
- **VPN Connection(s)**: Site-to-site connections between gateways

## Use Cases and Configuration

| Use Case            | Description                                    | VPN Connections | Tunnels            | Availability           |
| ------------------- | ---------------------------------------------- | --------------- | ------------------ | ---------------------- |
| `default`           | Standard configuration for basic connectivity  | 1               | 2 (per connection) | Single gateway         |
| `high_availability` | Redundant configuration for critical workloads | 2               | 4 (total)          | Active-active gateways |

## Supported Regions

### AWS Regions

- `eu-west-1` (Ireland)
- `eu-south-1` (Milan)

### Azure Regions

- `westeurope` (West Europe)
- `italynorth` (Italy North)

## BGP Configuration

- **AWS BGP ASN**: 65000 (fixed)
- **Azure BGP ASN**: 65010 (fixed)
- **Inside CIDR Ranges**: Pre-configured for tunnel communication

## Usage Example

```hcl
module "aws_azure_vpn" {
  source = "../../modules/aws_azure_vpn"

  # Environment configuration
  environment = {
    prefix          = "pagopa"
    env_short       = "d"
    app_name        = "network"
    instance_number = "01"
  }

  # Use case: 'default' or 'high_availability'
  use_case = "default"

  # AWS configuration
  aws = {
    region = "eu-west-1"
    vpc_id = "vpc-12345678"
  }

  # Azure configuration
  azure = {
    resource_group_name = "rg-network-d-weu-01"
    location           = "westeurope"
    vnet_id           = "/subscriptions/.../virtualNetworks/vnet-d-weu-01"
    vnet_name         = "vnet-d-weu-01"
    vpn_snet_id       = "/subscriptions/.../subnets/GatewaySubnet"

    # Optional: Use existing VPN gateway
    vpn = {
      virtual_network_gateway_id = null  # Will create new gateway
      public_ips = []                    # Will create new public IPs
    }
  }

  # Resource tags
  tags = {
    Environment = "development"
    Project     = "network-connectivity"
  }
}
```

## High Availability Example

```hcl
module "aws_azure_vpn_ha" {
  source = "../../modules/aws_azure_vpn"

  environment = {
    prefix          = "pagopa"
    env_short       = "p"
    app_name        = "network"
    instance_number = "01"
  }

  use_case = "high_availability"

  aws = {
    region = "eu-west-1"
    vpc_id = "vpc-87654321"
  }

  azure = {
    resource_group_name = "rg-network-p-weu-01"
    location           = "westeurope"
    vnet_id           = "/subscriptions/.../virtualNetworks/vnet-p-weu-01"
    vnet_name         = "vnet-p-weu-01"
    vpn_snet_id       = "/subscriptions/.../subnets/GatewaySubnet"
  }

  tags = {
    Environment = "production"
    Project     = "network-connectivity"
    Tier        = "high-availability"
  }
}
```

## Prerequisites

1. **AWS VPC**: Must exist with proper routing configuration
2. **Azure Virtual Network**: Must exist with a `GatewaySubnet` (minimum /27)
3. **Permissions**: Appropriate IAM and Azure RBAC permissions for VPN resources
4. **Network Planning**: Ensure no CIDR conflicts between AWS and Azure networks

## Important Notes

- Inside CIDR ranges are automatically assigned based on connection index
- The Azure Virtual Network Gateway uses VpnGw2 Generation2 SKU for optimal performance
- BGP is enabled for dynamic routing between environments

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_awsdx"></a> [awsdx](#requirement\_awsdx) | ~> 0.0 |
| <a name="requirement_azuredx"></a> [azuredx](#requirement\_azuredx) | ~> 0.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_cloudwatch_log_group.resolver_query_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_customer_gateway.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/customer_gateway) | resource |
| [aws_iam_instance_profile.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile) | resource |
| [aws_iam_role.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.coredns_cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy_attachment.coredns_ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_instance.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) | resource |
| [aws_network_interface.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface) | resource |
| [aws_route53_resolver_endpoint.inbound](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint) | resource |
| [aws_route53_resolver_endpoint.outbound](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint) | resource |
| [aws_route53_resolver_query_log_config.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_query_log_config) | resource |
| [aws_route53_resolver_query_log_config_association.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_query_log_config_association) | resource |
| [aws_route53_resolver_rule.azure_zones](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule) | resource |
| [aws_route53_resolver_rule_association.azure_zones](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule_association) | resource |
| [aws_security_group.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group.resolver](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_vpn_connection.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection) | resource |
| [aws_vpn_gateway.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway) | resource |
| [aws_vpn_gateway_route_propagation.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_gateway_route_propagation) | resource |
| [azuredx_dx_available_subnet_cidr.inbound_endpoint_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/dx_available_subnet_cidr) | resource |
| [azuredx_dx_available_subnet_cidr.outbound_endpoint_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/dx_available_subnet_cidr) | resource |
| [azurerm_local_network_gateway.tunnel1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway) | resource |
| [azurerm_local_network_gateway.tunnel2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway) | resource |
| [azurerm_private_dns_resolver.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver) | resource |
| [azurerm_private_dns_resolver_dns_forwarding_ruleset.aws](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_dns_forwarding_ruleset) | resource |
| [azurerm_private_dns_resolver_forwarding_rule.aws_domains](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_forwarding_rule) | resource |
| [azurerm_private_dns_resolver_inbound_endpoint.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_inbound_endpoint) | resource |
| [azurerm_private_dns_resolver_outbound_endpoint.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_outbound_endpoint) | resource |
| [azurerm_private_dns_resolver_virtual_network_link.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_virtual_network_link) | resource |
| [azurerm_public_ip.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip) | resource |
| [azurerm_subnet.inbound_endpoint_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.outbound_endpoint_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_virtual_network_gateway.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway) | resource |
| [azurerm_virtual_network_gateway_connection.tunnel1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection) | resource |
| [azurerm_virtual_network_gateway_connection.tunnel2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection) | resource |
| [time_sleep.wait_public_ips](https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep) | resource |
| [aws_ami.amazon_linux](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami) | data source |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_region.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_aws"></a> [aws](#input\_aws) | AWS related configuration. | <pre>object({<br/>    region               = string<br/>    vpc_id               = string<br/>    vpc_cidr             = string<br/>    route_table_ids      = list(string)<br/>    private_subnet_ids   = list(string)<br/>    private_subnet_cidrs = list(string)<br/>    private_dns_zones    = optional(list(string), [])<br/>  })</pre> | n/a | yes |
| <a name="input_azure"></a> [azure](#input\_azure) | -------# Azure # -------# | <pre>object({<br/>    resource_group_name = string<br/>    location            = string<br/>    vnet_id             = string<br/>    vnet_name           = string<br/>    vnet_cidr           = string<br/>    vpn_snet_id         = string<br/>    dns_forwarder_ip    = string<br/>    vpn = optional(object({ # If not provided, a new Virtual Network Gateway will be created<br/>      virtual_network_gateway_id = string<br/>      public_ips                 = list(string)<br/>    }), { virtual_network_gateway_id = null, public_ips = [] })<br/>    private_dns_zones = list(string)<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | SitetoSite VPN use case. Allowed values: 'default', 'high\_availability'. | `string` | `"default"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_aws_customer_gateways"></a> [aws\_customer\_gateways](#output\_aws\_customer\_gateways) | AWS Customer Gateway details |
| <a name="output_aws_vpn_connections"></a> [aws\_vpn\_connections](#output\_aws\_vpn\_connections) | AWS VPN Connection details |
| <a name="output_aws_vpn_gateway"></a> [aws\_vpn\_gateway](#output\_aws\_vpn\_gateway) | AWS VPN Gateway details |
| <a name="output_azure_local_network_gateways"></a> [azure\_local\_network\_gateways](#output\_azure\_local\_network\_gateways) | Azure Local Network Gateway details |
| <a name="output_azure_public_ips"></a> [azure\_public\_ips](#output\_azure\_public\_ips) | Azure Public IP addresses for VPN Gateway |
| <a name="output_azure_virtual_network_gateway"></a> [azure\_virtual\_network\_gateway](#output\_azure\_virtual\_network\_gateway) | Azure Virtual Network Gateway details |
| <a name="output_vpn_configuration"></a> [vpn\_configuration](#output\_vpn\_configuration) | VPN configuration summary |
<!-- END_TF_DOCS -->
