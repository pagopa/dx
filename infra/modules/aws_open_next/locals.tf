locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/project.json")).metadata.version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/project.json")).name, "unknown")
    }
  )

  enable_alarms = length(var.alarms_actions) > 0
}
