resource "aws_sqs_queue" "revalidation_queue" {
  name                        = "${local.app_prefix}-isr-revalidation-sqs-${local.app_suffix}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  sqs_managed_sse_enabled     = true

  tags = var.tags
}

resource "aws_lambda_event_source_mapping" "revalidation_queue_source" {
  event_source_arn = aws_sqs_queue.revalidation_queue.arn
  function_name    = aws_lambda_function.function.arn
}
