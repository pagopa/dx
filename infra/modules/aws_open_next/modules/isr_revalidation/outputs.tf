output "iam_role" {
  value = {
    arn  = aws_iam_role.lambda_role.arn
    name = aws_iam_role.lambda_role.name
  }
}

output "lambda_function" {
  value = {
    arn  = aws_lambda_function.function.arn
    name = aws_lambda_function.function.function_name
  }
}

output "ddb_tags_table" {
  value = {
    name = aws_dynamodb_table.tags.name
    arn  = aws_dynamodb_table.tags.arn
  }
}

output "sqs_queue" {
  value = {
    name = aws_sqs_queue.revalidation_queue.name
    arn  = aws_sqs_queue.revalidation_queue.arn
    url  = aws_sqs_queue.revalidation_queue.url
  }
}
