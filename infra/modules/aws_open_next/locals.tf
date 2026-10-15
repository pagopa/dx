locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"),
      ModuleName    = "aws_open_next"
    }
  )

  enable_alarms = length(var.alarms_actions) > 0
}
