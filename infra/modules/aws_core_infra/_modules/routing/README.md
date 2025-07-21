# routing

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_route_table.isolated](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table.private](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table) | resource |
| [aws_route_table_association.isolated](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.private](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |
| [aws_route_table_association.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_internet_gateway_id"></a> [internet\_gateway\_id](#input\_internet\_gateway\_id) | ID of the Internet Gateway | `string` | n/a | yes |
| <a name="input_isolated_subnet_ids"></a> [isolated\_subnet\_ids](#input\_isolated\_subnet\_ids) | List of isolated subnet IDs | `list(string)` | `[]` | no |
| <a name="input_naming_config"></a> [naming\_config](#input\_naming\_config) | Configuration for resource naming convention | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    instance_number = number<br/>  })</pre> | n/a | yes |
| <a name="input_nat_gateway_ids"></a> [nat\_gateway\_ids](#input\_nat\_gateway\_ids) | List of NAT Gateway IDs | `list(string)` | `[]` | no |
| <a name="input_private_subnet_ids"></a> [private\_subnet\_ids](#input\_private\_subnet\_ids) | List of private subnet IDs | `list(string)` | n/a | yes |
| <a name="input_public_subnet_ids"></a> [public\_subnet\_ids](#input\_public\_subnet\_ids) | List of public subnet IDs | `list(string)` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Tags to apply to resources | `map(any)` | n/a | yes |
| <a name="input_vpc_id"></a> [vpc\_id](#input\_vpc\_id) | ID of the VPC | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_isolated_route_table_ids"></a> [isolated\_route\_table\_ids](#output\_isolated\_route\_table\_ids) | IDs of the isolated route tables |
| <a name="output_private_route_table_ids"></a> [private\_route\_table\_ids](#output\_private\_route\_table\_ids) | IDs of the private route tables |
| <a name="output_public_route_table_ids"></a> [public\_route\_table\_ids](#output\_public\_route\_table\_ids) | IDs of the public route tables |
<!-- END_TF_DOCS -->
