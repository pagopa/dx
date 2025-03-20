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
    id                  = module.github_runner.container_app_job.id
    name                = module.github_runner.container_app_job.name
    resource_group_name = module.github_runner.container_app_job.resource_group_name
  }
}

output "identities" {
  value = {
    app = {
      cd = {
        id   = azurerm_user_assigned_identity.app_cd.id
        name = azurerm_user_assigned_identity.app_cd.name
      }
    }
    infra = {
      ci = {
        id   = azurerm_user_assigned_identity.infra_ci.id
        name = azurerm_user_assigned_identity.infra_ci.name
      }
      cd = {
        id   = azurerm_user_assigned_identity.infra_cd.id
        name = azurerm_user_assigned_identity.infra_cd.name
      }
    }
    opex = {
      ci = {
        id   = azurerm_user_assigned_identity.opex_ci.id
        name = azurerm_user_assigned_identity.opex_ci.name
      }
      cd = {
        id   = azurerm_user_assigned_identity.opex_cd.id
        name = azurerm_user_assigned_identity.opex_cd.name
      }
    }
  }
}
