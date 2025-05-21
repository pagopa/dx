output "distribution_url" {
  value       = aws_cloudfront_distribution.distribution.domain_name
  description = "The URL of the CloudFront distribution."
}

output "distribution_id" {
  value       = aws_cloudfront_distribution.distribution.id
  description = "The ID of the CloudFront distribution."
}

output "distribution_arn" {
  value       = aws_cloudfront_distribution.distribution.arn
  description = "The ARN of the CloudFront distribution."
}
