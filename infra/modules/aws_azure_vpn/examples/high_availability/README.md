# high_availability

This fresh-deployment example uses AzureRM v5 and takes existing Azure
foundation values through the `azure` input. Provision the foundation
separately, with GatewaySubnet and no existing DNS resolver. See the module
README for sample values. AWS networking uses the VPC module with one NAT
gateway per availability zone. Review fixture resource addresses before
reusing existing example state: previously managed foundation resources need
an explicit state-ownership migration before applying this new example.
The referenced VPN major must be published before registry initialization.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.17.0 |
| <a name="requirement_awsdx"></a> [awsdx](#requirement\_awsdx) | ~> 0.1 |
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | ~> 2.0 |
| <a name="requirement_azuredx"></a> [azuredx](#requirement\_azuredx) | ~> 0.12 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 5.0.0, < 6.0.0 |

## Modules

| Name | Source | Version |
| ---- | ------ | ------- |
| <a name="module_aws"></a> [aws](#module\_aws) | terraform-aws-modules/vpc/aws | ~> 6.0 |
| <a name="module_vpn"></a> [vpn](#module\_vpn) | pagopa-dx/aws-azure-vpn/aws | ~> 4.0 |

## Resources

| Name | Type |
| ---- | ---- |
| [aws_availability_zones.available](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones) | data source |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_azure"></a> [azure](#input\_azure) | Existing Azure foundation values. The VNet must contain GatewaySubnet (at least /27); use a fresh VNet without a DNS resolver because the VPN module creates one. Provision the foundation separately so v4-only modules do not constrain this v5 configuration. | <pre>object({<br/>    resource_group_name = string<br/>    location            = string<br/>    vnet_id             = string<br/>    vnet_name           = string<br/>    vnet_cidr           = string<br/>    dns_forwarder_ip    = string<br/>    asn                 = optional(number, 64512)<br/>    vpn = optional(object({<br/>      virtual_network_gateway_id = string<br/>      public_ips                 = list(string)<br/>    }), { virtual_network_gateway_id = null, public_ips = [] })<br/>    private_dns_zones = list(string)<br/>  })</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
