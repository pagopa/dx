/**
 * DynamoDB OAuth Token Storage
 * Provides high-availability persistent storage for OAuth tokens
 */
# trivy:ignore:AVD-AWS-0024 Point-in-time recovery not required for ephemeral OAuth tokens
# trivy:ignore:AVD-AWS-0025 AWS managed encryption is sufficient for OAuth token storage
resource "aws_dynamodb_table" "oauth_tokens" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "oauth-tokens"
    resource_type = "dynamodb_table"
  }))

  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tokenKey"

  attribute {
    name = "tokenKey"
    type = "S"
  }

  # Time to Live (TTL) for automatic expiration
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Encryption at rest
  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  alarm_name          = "${aws_dynamodb_table.oauth_tokens.name}-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when DynamoDB read capacity is throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.oauth_tokens.name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  alarm_name          = "${aws_dynamodb_table.oauth_tokens.name}-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when DynamoDB write capacity is throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.oauth_tokens.name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_user_errors" {
  alarm_name          = "${aws_dynamodb_table.oauth_tokens.name}-user-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert on DynamoDB user errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.oauth_tokens.name
  }
}
