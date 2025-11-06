locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  use_cases = {
    default = {
      cpu    = 1.25
      memory = "2.5Gi"
      replicas = {
        min = 1
        max = 8
      }
    }
  }

  use_case_features = local.use_cases[var.use_case]

  cpu_size    = var.size != null ? var.size.cpu : local.use_case_features.cpu
  memory_size = var.size != null ? var.size.memory : local.use_case_features.memory

  replica_minimum = try(var.autoscaler.replicas.minimum, local.use_case_features.replicas.min)
  replica_maximum = try(var.autoscaler.replicas.maximum, local.use_case_features.replicas.max)
}
