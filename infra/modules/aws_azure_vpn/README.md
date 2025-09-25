# DX - AWS Azure VPN Module

This Terraform module establishes a Site-to-Site VPN connection between AWS and Azure, enabling secure communication between resources in both cloud environments. The module supports both development and high-availability configurations and includes DNS resolution across clouds.

## Features

✅ **Secure connectivity** between your AWS VPC and Azure Virtual Network  
✅ **High availability** option with redundant connections for production workloads  
✅ **Automatic routing** - no manual route management needed  
✅ **Cross-cloud DNS** - resolve private hostnames across both environments  
✅ **Production ready** - tested configurations for enterprise use

## Architecture

### Development Configuration

The development configuration provides a single VPN connection with basic redundancy, suitable for development and testing environments.

### High Availability Configuration

The high availability configuration provides multiple VPN connections with enhanced redundancy, recommended for production environments.

The module creates secure IPSec tunnels between your AWS and Azure networks with automatic routing and cross-cloud DNS resolution.

## Usage Example

For detailed usage examples, refer to the [examples folder](./examples/) that includes both a cheaper and less reliable [development example](./examples/development/) and a more expensive [high availability example](./examples/high_availability/) that demonstrates all features and configuration.

## Prerequisites

Before using this module, ensure you have:

✅ **AWS VPC** with private subnets and route tables  
✅ **Azure Virtual Network** with a Gateway Subnet (at least /27 size)  
✅ **Non-overlapping IP ranges** between AWS and Azure networks  
✅ **Appropriate permissions** in both AWS and Azure accounts

**Important:** For development use case, ensure your AWS core infrastructure has `nat_gateway_count` set to at least 1.

## Use Cases

**Perfect for:**

- Multi-cloud applications that need AWS and Azure services
- Migrating workloads between AWS and Azure
- Disaster recovery scenarios across clouds
- Hybrid architectures with services in both environments

**Configuration options:**

- **Development**: Single VPN connection for development/testing (cost-optimized)
- **High availability**: Multiple redundant connections for production workloads

1. **AWS Prerequisites**:
   - VPC with private subnets
   - Route tables that need VPN connectivity

2. **Azure Prerequisites**:
   - Virtual Network with GatewaySubnet (minimum /27) - created by the azure-core-infra module
   - Resource group for network resources
   - DNS forwarder IP (if using cross-cloud DNS)

## Troubleshooting

### "My VPN isn't connecting"

**Check these first:**

1. Make sure your Azure Gateway Subnet is at least /27 in size
2. Verify your AWS and Azure networks don't have overlapping IP ranges
3. Wait 15-20 minutes - VPN connections take time to establish

**Still not working?** Check the connection status in:

- AWS Console → VPC → VPN Connections
- Azure Portal → Virtual Network Gateways → Connections

### "I can't reach services across clouds"

**Quick fixes:**

1. Check your security groups (AWS) and Network Security Groups (Azure) allow traffic
2. Verify your route tables are updated (this should happen automatically)
3. Try pinging by IP address first, then by hostname

### "DNS isn't working across clouds"

**Common solutions:**

1. Make sure you specified the correct DNS zones in your configuration
2. Check that your DNS forwarder IP is reachable
3. Wait a few minutes for DNS changes to propagate

### "High availability mode isn't working"

**Things to check:**

1. Ensure you have enough public IP addresses
2. Verify your Azure VPN Gateway supports active-active mode
3. Check that both VPN tunnels show as "Connected"

### Still need help?

1. Check the VPN connection logs in both AWS and Azure consoles
2. Verify all required permissions are in place
3. Consider opening a support ticket with detailed error messages

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
| <a name="input_aws"></a> [aws](#input\_aws) | AWS configuration object containing all required AWS-side settings. Includes the target VPC details, networking configuration, and DNS zones for cross-cloud resolution. <br/>The region must be supported (eu-west-1, eu-south-1). Route table IDs will be updated with VPN routes. Private subnets are used for DNS resolver endpoints. <br/>DNS zones listed here will be forwarded to Azure for resolution. | <pre>object({<br/>    region               = string<br/>    vpc_id               = string<br/>    vpc_cidr             = string<br/>    route_table_ids      = list(string)<br/>    private_subnet_ids   = list(string)<br/>    private_subnet_cidrs = list(string)<br/>    private_dns_zones    = optional(list(string), [])<br/>  })</pre> | n/a | yes |
| <a name="input_azure"></a> [azure](#input\_azure) | Azure configuration object containing all required Azure-side settings. Includes the target Virtual Network details, resource group, and VPN gateway configuration. <br/>The vpn\_snet\_id must point to a GatewaySubnet (minimum /27). If vpn.virtual\_network\_gateway\_id is null, a new VPN gateway will be created. <br/>The dns\_forwarder\_ip should point to your Azure DNS forwarder for cross-cloud DNS resolution. Private DNS zones listed here will be forwarded to AWS for resolution. | <pre>object({<br/>    resource_group_name = string<br/>    location            = string<br/>    vnet_id             = string<br/>    vnet_name           = string<br/>    vnet_cidr           = string<br/>    dns_forwarder_ip    = string<br/>    vpn = optional(object({ # If not provided, a new Virtual Network Gateway will be created<br/>      virtual_network_gateway_id = string<br/>      public_ips                 = list(string)<br/>    }), { virtual_network_gateway_id = null, public_ips = [] })<br/>    private_dns_zones = list(string)<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Deployment scenario for the Site-to-Site VPN connection. 'development' creates a single VPN connection suitable for dev/test environments (cost-optimized). 'high\_availability' creates multiple redundant VPN connections for production workloads with enhanced reliability. | `string` | `"development"` | no |

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
