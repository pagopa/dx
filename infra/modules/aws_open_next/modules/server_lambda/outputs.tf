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
    url = aws_lambda_function_url.function_url.function_url
  }
}

output "security_group" {
  value = {
    id   = aws_security_group.lambda[0].id
    name = aws_security_group.lambda[0].name
  }
}

output "cloudfront_origin_access_control" {
  value = {
    id = aws_cloudfront_origin_access_control.lambda.id
    arn = aws_cloudfront_origin_access_control.lambda.arn
  }
}
