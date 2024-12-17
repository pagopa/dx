output "container_app_job" {
  value = {
    id                  = azurerm_container_app_job.github_runner.id
    name                = azurerm_container_app_job.github_runner.name
    resource_group_name = azurerm_container_app_job.github_runner.resource_group_name
  }
}
