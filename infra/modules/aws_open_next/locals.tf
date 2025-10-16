locals {
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/package.json")).name, "unknown")
    }
  )
}
