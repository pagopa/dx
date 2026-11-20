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

output "domain_name" {
  value       = aws_cloudfront_distribution.distribution.domain_name
  description = "The domain name of the CloudFront distribution."
}


output "hosted_zone_id" {
  value       = aws_cloudfront_distribution.distribution.hosted_zone_id
  description = "The hosted zone ID of the CloudFront distribution."
}

output "waf" {
  value = var.enable_waf ? {
    name = aws_wafv2_web_acl.cloudfront[0].name
    arn  = aws_wafv2_web_acl.cloudfront[0].arn
  } : null
  description = "The CloudFront WAF web ACL name and ARN, or null when WAF is disabled."
}