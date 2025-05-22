resource "aws_lambda_function" "function" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  function_name = "${local.app_prefix}-lambda-${local.app_suffix}"
  description   = "OpenNext ISR Lambda Function for project ${local.project}"

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
    variables = var.environment_variables
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
  tags              = var.tags
}
