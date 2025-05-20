resource "aws_cloudwatch_event_rule" "scheduled_lambda_event_rule" {
  name                = "${local.app_prefix}-server-lambda-warmer-${local.app_suffix}"
  schedule_expression = "rate(5 minutes)"

  description         = "Scheduled event rule to warm the OpenNext server lambda ${aws_lambda_function.function.function_name}"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  arn  = aws_lambda_function.function.arn
  rule = aws_cloudwatch_event_rule.scheduled_lambda_event_rule.name
}

resource "aws_lambda_permission" "allow_execution_from_eventbridge" {
  statement_id  = "AllowExecutionFromEventbridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.function.function_name
  principal     = "events.amazonaws.com"
}
