output "resource_group" {
  value = {
    id       = azurerm_resource_group.main.id
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
  }
}

output "repository" {
  value = {
    id   = github_repository.this.id
    name = github_repository.this.name
  }
}

output "github_private_runner" {
  value = {
    id                  = azurerm_container_app_job.github_runner.id
    name                = azurerm_container_app_job.github_runner.name
    resource_group_name = azurerm_container_app_job.github_runner.resource_group_name
  }
}
