output "iam_role" {
  value = {
    arn  = aws_iam_role.lambda_role.arn
    name = aws_iam_role.lambda_role.name
  }
}

output "lambda_function" {
  value = {
    arn  = aws_lambda_function.lambda_function.arn
    name = aws_lambda_function.lambda_function.function_name
  }
}
