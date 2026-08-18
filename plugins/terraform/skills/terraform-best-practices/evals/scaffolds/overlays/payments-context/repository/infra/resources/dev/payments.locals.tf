locals {
  payments_environment = merge(local.environment, {
    domain   = "pay"
    app_name = "proc"
  })
}
