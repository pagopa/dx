locals {
  is_dev_environment = var.naming_config.environment == "d" ? true : false
}
