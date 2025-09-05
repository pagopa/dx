output "lambda_code_bucket" {
  value = {
    name                 = aws_s3_bucket.lambda_code.bucket
    arn                  = aws_s3_bucket.lambda_code.arn
    regional_domain_name = aws_s3_bucket.lambda_code.bucket_regional_domain_name
    region               = var.environment.region
  }
}
