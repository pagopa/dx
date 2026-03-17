# Environment configuration for resource naming
locals {
  environment_short = merge(var.environment, {
    app_name = "container-app"
  })
}
