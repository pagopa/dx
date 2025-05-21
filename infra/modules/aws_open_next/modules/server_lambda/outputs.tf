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
    url  = trimsuffix(trimprefix(aws_lambda_function_url.function_url.function_url, "https://"), "/")
    full_url = aws_lambda_function_url.function_url.function_url
  }
}

output "security_group" {
  value = {
    id   = try(aws_security_group.lambda[0].id, null)
    name = try(aws_security_group.lambda[0].name, null)
  }
}

output "cloudfront_origin_access_control" {
  value = {
    id  = aws_cloudfront_origin_access_control.lambda.id
    arn = aws_cloudfront_origin_access_control.lambda.arn
  }
}
