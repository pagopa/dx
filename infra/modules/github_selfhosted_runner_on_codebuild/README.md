# github_selfhosted_runner_on_codebuild

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
| [aws_codebuild_project.github_runner](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project) | resource |
| [aws_codebuild_source_credential.ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_source_credential) | resource |
| [aws_codebuild_source_credential.string](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_source_credential) | resource |
| [aws_codebuild_webhook.github_webhook](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_webhook) | resource |
| [aws_iam_policy.cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.github_connection](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.vpc_connection](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.codebuild_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy_attachment.cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.codebuild_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.github_connection](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.vpc_connection](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_security_group.codebuild](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group_rule.codebuild_egress](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_ssm_parameter.personal_access_token](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_build_timeout"></a> [build\_timeout](#input\_build\_timeout) | The timeout for the build process in minutes | `number` | `480` | no |
| <a name="input_env_variables"></a> [env\_variables](#input\_env\_variables) | Build environment variables. These are intended as an addition to the ones specified in the GitHub environment. | `map(string)` | `{}` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_personal_access_token"></a> [personal\_access\_token](#input\_personal\_access\_token) | GitHub personal access token used to authenticate. If none provided, the GitHub App will be used. Please, make sure that one has already been installed in your repository (See how: https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html). | <pre>object({<br/>    ssm_parameter_name = optional(string, null)<br/>    value              = optional(string, null)<br/>  })</pre> | `null` | no |
| <a name="input_repository"></a> [repository](#input\_repository) | Source repository information | <pre>object({<br/>    owner = optional(string, "pagopa")<br/>    name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_secrets"></a> [secrets](#input\_secrets) | Secrets to be used in the build environment. The key is the name of the environment variable, and the value is the name of the SSM parameter or Secrets Manager secret. These are intended as an addition to the ones specified in the GitHub environment. | <pre>map(object({<br/>    ssm_parameter_name   = optional(string, null)<br/>    secrets_manager_name = optional(string, null)<br/>  }))</pre> | `{}` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on build requirements. Allowed values are 's', 'm', 'l', 'xl'. | `string` | `"l"` | no |
| <a name="input_vpc"></a> [vpc](#input\_vpc) | The VPC used to deploy the resources | <pre>object({<br/>    id              = string<br/>    private_subnets = list(string)<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_iam_role"></a> [iam\_role](#output\_iam\_role) | n/a |
| <a name="output_security_group"></a> [security\_group](#output\_security\_group) | n/a |
<!-- END_TF_DOCS -->
