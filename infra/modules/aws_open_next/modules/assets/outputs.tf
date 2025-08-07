output "bucket" {
  value = {
    name                 = aws_s3_bucket.assets.bucket
    arn                  = aws_s3_bucket.assets.arn
    regional_domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    region               = var.environment.location
  }
}

output "cloudfront_origin_access_control" {
  value = {
    id  = aws_cloudfront_origin_access_control.assets.id
    arn = aws_cloudfront_origin_access_control.assets.arn
  }
}
