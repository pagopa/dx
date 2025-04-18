output "prefix" {
  description = "The full prefix used in the naming convention for resources. It is composed of the environment prefix, environment short name, location short name, optionally the domain and app name. Example: 'dx-d-itn-[DOMAIN]-name'."
  value       = local.app_prefix
}

output "suffix" {
  description = "The suffix used in the naming convention for resources, representing the instance number of the resource. Example: '01'."
  value       = local.app_suffix
}

output "project" {
  description = "The project identifier used in the naming convention, combining the environment prefix, environment short name, and location short name. Example: 'dx-d-itn'."
  value       = local.project
}

output "domain" {
  description = "The domain segment used in the naming convention, derived from the environment's domain value or a default placeholder if not provided."
  value       = local.domain
}

output "env_name" {
  description = "The full name of the environment, derived from the short name provided in the environment configuration. Example: 'dev' for 'd'."
  value       = lookup(local.environment_map, var.environment.env_short, "p")
}
