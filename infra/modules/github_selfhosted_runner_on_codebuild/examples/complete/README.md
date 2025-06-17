# complete

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | 5.90.1 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_runner"></a> [runner](#module\_runner) | ../../ | n/a |
| <a name="module_vpc"></a> [vpc](#module\_vpc) | terraform-aws-modules/vpc/aws | ~> 5.0 |

## Resources

| Name | Type |
|------|------|
| [aws_security_group.db](https://registry.terraform.io/providers/hashicorp/aws/5.90.1/docs/resources/security_group) | resource |
| [aws_security_group_rule.codebuild_db_ingress](https://registry.terraform.io/providers/hashicorp/aws/5.90.1/docs/resources/security_group_rule) | resource |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
