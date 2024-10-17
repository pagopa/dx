locals {
  resource_group = {
    name     = "${module.naming_convention.prefix}-${module.naming_convention.suffix}"
    location = var.environment.location
  }
}
