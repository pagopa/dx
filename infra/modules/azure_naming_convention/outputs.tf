output "prefix" {
  value = local.app_prefix
}

output "suffix" {
  value = local.app_suffix
}

output "project" {
  value = local.project
}

output "domain" {
  value = local.domain
}

output "name" {
  value = local.abbreviation != "unknown" ? "${local.app_prefix}-${local.abbreviation}-${local.app_suffix}" : null
}