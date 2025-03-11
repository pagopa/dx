# aws_web_app

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
| [aws_amplify_app.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app) | resource |
| [aws_amplify_branch.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_branch) | resource |
| [aws_amplify_domain_association.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_domain_association) | resource |
| [aws_cloudwatch_event_rule.amplify_app_branch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule) | resource |
| [aws_cloudwatch_event_target.amplify_app_branch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target) | resource |
| [aws_codeconnections_connection.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codeconnections_connection) | resource |
| [aws_iam_role.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_route53_record.certificate](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_route53_record.naked_domain](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_route53_record.sub_domains](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_sns_topic.amplify_app_branch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic) | resource |
| [aws_sns_topic_policy.amplify_app_branch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy) | resource |
| [aws_sns_topic_subscription.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription) | resource |
| [aws_iam_policy_document.amplify](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.amplify_app_branch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_build_information"></a> [build\_information](#input\_build\_information) | n/a | <pre>object({<br/>    app_path         = string       # e.g. "apps/mywebsite"<br/>    build_path       = string       # e.g. "apps/mywebsite/.next"<br/>    install_commands = list(string) # e.g. ["npm install"]<br/>    build_commands   = list(string) # e.g. ["npm run compile", "npm run build -w mywebsite"]<br/>  })</pre> | n/a | yes |
| <a name="input_create_codeconnection"></a> [create\_codeconnection](#input\_create\_codeconnection) | If a codeconnection creation is requested please note that, after apply, it will also need a manual configuration from the AWS console to work. | `bool` | `false` | no |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration. Sub domains are optional and in the form of dev (dev.example.com), test (test.example.com), etc. | <pre>object({<br/>    name        = string<br/>    zone_id     = string<br/>    sub_domains = optional(list(string), [])<br/>  })</pre> | `null` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment_variables"></a> [environment\_variables](#input\_environment\_variables) | Environment variables for the application | `map(string)` | `{}` | no |
| <a name="input_github_authorization_type"></a> [github\_authorization\_type](#input\_github\_authorization\_type) | Authorization can be done via GitHub PAT or AWS Codeconnection. Valid values are `PAT`, `AWS`. If a Codeconnection is not present in your AWS account, use the create\_codeconnection variable to create one. | `string` | n/a | yes |
| <a name="input_github_pat"></a> [github\_pat](#input\_github\_pat) | GitHub PAT to use for authentication as an alternative to AWS Codeconnection. | `string` | `null` | no |
| <a name="input_is_ssr"></a> [is\_ssr](#input\_is\_ssr) | Set to true if the application is a server-side rendered application | `bool` | `false` | no |
| <a name="input_monitoring"></a> [monitoring](#input\_monitoring) | Monitoring configuration | <pre>object({<br/>    enabled       = bool,<br/>    target_emails = list(string)<br/>  })</pre> | n/a | yes |
| <a name="input_redirect_rules"></a> [redirect\_rules](#input\_redirect\_rules) | Redirect rules for the application. A default one is automatically created to redirect all 404s to index.html. Read the [configuration guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app#custom_rule-block) to add more. | <pre>list(object({<br/>    source = string<br/>    status = optional(string, null)<br/>    target = string<br/>  }))</pre> | `[]` | no |
| <a name="input_repository"></a> [repository](#input\_repository) | Source repository information | <pre>object({<br/>    organization = string<br/>    name         = string<br/>    branch_name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_app"></a> [app](#output\_app) | n/a |
| <a name="output_iam_role"></a> [iam\_role](#output\_iam\_role) | n/a |
<!-- END_TF_DOCS -->
