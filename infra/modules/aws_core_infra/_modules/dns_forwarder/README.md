# dns_forwarder

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | >= 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_iam_instance_profile.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile) | resource |
| [aws_iam_role.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.coredns_cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_instance.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) | resource |
| [aws_security_group.coredns](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_ami.amazon_linux](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami) | data source |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_region.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) | data source |
| [aws_subnet.target](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cross_cloud_dns_config"></a> [cross\_cloud\_dns\_config](#input\_cross\_cloud\_dns\_config) | Cross-cloud DNS configuration for Azure integration. | <pre>object({<br/>    azure_coredns_ip = string<br/>    azure_vnet_cidr  = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | Project name for resource naming. | `string` | n/a | yes |
| <a name="input_static_private_ip"></a> [static\_private\_ip](#input\_static\_private\_ip) | Static private IP address for the CoreDNS instance. If empty, will use cidrhost calculation. | `string` | `""` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | Subnet ID where to deploy the CoreDNS instance. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_vpc_cidr"></a> [vpc\_cidr](#input\_vpc\_cidr) | VPC CIDR block for security group rules. | `string` | n/a | yes |
| <a name="input_vpc_id"></a> [vpc\_id](#input\_vpc\_id) | VPC ID for security group creation. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_coredns_endpoint"></a> [coredns\_endpoint](#output\_coredns\_endpoint) | DNS endpoint for CoreDNS forwarder |
| <a name="output_coredns_instance_id"></a> [coredns\_instance\_id](#output\_coredns\_instance\_id) | EC2 instance ID of the CoreDNS forwarder |
| <a name="output_coredns_private_ip"></a> [coredns\_private\_ip](#output\_coredns\_private\_ip) | Private IP address of the CoreDNS forwarder |
| <a name="output_security_group_id"></a> [security\_group\_id](#output\_security\_group\_id) | Security group ID for the CoreDNS forwarder |
<!-- END_TF_DOCS -->
