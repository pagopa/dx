locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/module.json")).name, basename(path.module))
    }
  )

  enable_alarms = length(var.alarms_actions) > 0
}
