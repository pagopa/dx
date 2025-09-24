output "server" {
  value       = module.server
  description = "The server lambda function."
}

output "image_optimizer" {
  value       = module.image_optimizer
  description = "The image optimizer lambda function."
}

output "isr_revalidation" {
  value       = module.isr_revalidation
  description = "The ISR revalidation lambda function."
}

output "initializer" {
  value       = module.initializer
  description = "The initializer lambda function."
}

output "cloudfront" {
  value       = module.cloudfront
  description = "The CloudFront distribution."
}

output "assets" {
  value       = module.assets
  description = "The assets bucket."
}

output "common" {
  value       = module.common
  description = "The common resources module."
}
