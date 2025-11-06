# server_lambda

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_cloudfront_origin_access_control.lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control) | resource |
| [aws_cloudwatch_event_rule.scheduled_lambda_event_rule](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule) | resource |
| [aws_cloudwatch_event_target.lambda_target](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target) | resource |
| [aws_cloudwatch_log_group.function_log_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_cloudwatch_metric_alarm.lambda_error_alarm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_iam_policy.lambda_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.lambda_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy_attachment.lambda_execution_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.lambda_policy_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.s3_read_only](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_lambda_alias.production](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias) | resource |
| [aws_lambda_function.function](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) | resource |
| [aws_lambda_function_url.function_url](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_url) | resource |
| [aws_lambda_permission.allow_execution_from_eventbridge](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission) | resource |
| [aws_lambda_permission.function_url_permission](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission) | resource |
| [aws_security_group.lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_security_group_rule.lambda_egress](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule) | resource |
| [archive_file.lambda_zip](https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file) | data source |
| [aws_iam_policy_document.lambda_assume_role_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.lambda_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_alarms_actions"></a> [alarms\_actions](#input\_alarms\_actions) | List of actions to perform when an alarm is triggered. This can include SNS topics, Lambda functions, etc. If empty, no actions will be performed. | `list(string)` | `[]` | no |
| <a name="input_assets_bucket"></a> [assets\_bucket](#input\_assets\_bucket) | The information of the S3 bucket where the OpenNext assets are stored. | <pre>object({<br/>    name   = string<br/>    arn    = string<br/>    region = string<br/>  })</pre> | n/a | yes |
| <a name="input_enable_alarms"></a> [enable\_alarms](#input\_enable\_alarms) | Whether to enable CloudWatch alarms for the lambda function. | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment_variables"></a> [environment\_variables](#input\_environment\_variables) | The environment variables to set for the lambda function. | `map(string)` | `{}` | no |
| <a name="input_handler"></a> [handler](#input\_handler) | The function entrypoint in your code. The format is <filename>.<function\_name>. For example, if your code is in a file called index.js and the function name is handler, the value should be index.handler. | `string` | `"index.handler"` | no |
| <a name="input_is_streaming_enabled"></a> [is\_streaming\_enabled](#input\_is\_streaming\_enabled) | Whether to use streaming for the server lambda function. If this is true, the wrapper override must be set to 'aws-lambda-streaming' in the 'open-next.config.ts'. More info at https://opennext.js.org/aws/config/simple_example#streaming-with-lambda. The default is false. | `bool` | `false` | no |
| <a name="input_isr_queue"></a> [isr\_queue](#input\_isr\_queue) | The ARN and URL of the SQS queue used for ISR revalidation. | <pre>object({<br/>    name = string<br/>    arn  = string<br/>    url  = string<br/>  })</pre> | n/a | yes |
| <a name="input_isr_tags_ddb"></a> [isr\_tags\_ddb](#input\_isr\_tags\_ddb) | The information of the DynamoDB table used for ISR revalidation. | <pre>object({<br/>    name = string<br/>    arn  = string<br/>  })</pre> | n/a | yes |
| <a name="input_lambda_layers"></a> [lambda\_layers](#input\_lambda\_layers) | The list of Lambda layers to attach to the function. The default is an empty list. | `list(string)` | `[]` | no |
| <a name="input_memory_size"></a> [memory\_size](#input\_memory\_size) | The amount of memory available to the function at runtime in MB. The default is 1024 MB. The maximum is 10240 MB. | `number` | `1024` | no |
| <a name="input_node_major_version"></a> [node\_major\_version](#input\_node\_major\_version) | The major version of the runtime to use for the lambda function. Allowed values are 20 or 22. | `string` | `"20"` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_timeout"></a> [timeout](#input\_timeout) | The maximum execution time for the function. The default is 30 seconds. The maximum is 900 seconds. | `number` | `30` | no |
| <a name="input_vpc"></a> [vpc](#input\_vpc) | The VPC used to deploy the lambda function in. Configure this only when you want the lambda to access private resources contained in the VPC. | <pre>object({<br/>    id              = string<br/>    private_subnets = list(string)<br/>  })</pre> | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cloudfront_origin_access_control"></a> [cloudfront\_origin\_access\_control](#output\_cloudfront\_origin\_access\_control) | n/a |
| <a name="output_iam_role"></a> [iam\_role](#output\_iam\_role) | n/a |
| <a name="output_lambda_function"></a> [lambda\_function](#output\_lambda\_function) | n/a |
| <a name="output_security_group"></a> [security\_group](#output\_security\_group) | n/a |
<!-- END_TF_DOCS -->
