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

output "env_name" {
  value = lookup(local.environment_map, var.environment.env_short)
}
