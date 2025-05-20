output "bucket" {
  value = {
    name = aws_s3_bucket.assets.bucket
    arn  = aws_s3_bucket.assets.arn
  }
}

output "cloudfront_origin_access_identity" {
  value = {
    id = aws_cloudfront_origin_access_identity.assets.id
    arn = aws_cloudfront_origin_access_identity.assets.arn
  }
}
