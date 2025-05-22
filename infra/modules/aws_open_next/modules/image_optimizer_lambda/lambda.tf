resource "aws_lambda_function" "function" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  function_name = "${local.app_prefix}-lambda-${local.app_suffix}"
  description   = "OpenNext Image Optimizer Lambda Function for project ${local.project}"

  handler       = var.handler
  runtime       = "nodejs${var.node_major_version}.x"
  architectures = ["arm64"]
  role          = aws_iam_role.lambda_role.arn

  # kms_key_arn                    = var.kms_key_arn
  # reserved_concurrent_executions = var.reserved_concurrent_executions

  memory_size = var.memory_size
  timeout     = var.timeout
  publish     = false

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = merge({
      BUCKET_NAME       = var.assets_bucket.name,
      BUCKET_KEY_PREFIX = "assets"
      },
    var.environment_variables)
  }

  # dynamic "dead_letter_config" {
  #   for_each = var.dead_letter_config != null ? [true] : []

  #   content {
  #     target_arn = var.dead_letter_config.target_arn
  #   }
  # }

  tags = var.tags

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "function_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.function.function_name}"
  skip_destroy      = true
  retention_in_days = 30
  # kms_key_id        = var.log_group.kms_key_id
  tags = var.tags
}

resource "aws_lambda_function_url" "function_url" {
  function_name      = aws_lambda_function.function.function_name
  authorization_type = "AWS_IAM"
  # Change to RESPONSE_STREAM once the feature is production ready
  # https://opennext.js.org/aws/v2/inner_workings/streaming
  invoke_mode = "BUFFERED"
}

resource "aws_lambda_permission" "function_url_permission" {
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.function.function_name
  principal              = "cloudfront.amazonaws.com"
  function_url_auth_type = "AWS_IAM"
}
