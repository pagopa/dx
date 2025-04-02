output "resource_group" {
  description = "Details of the main resource group, including ID, name, and location."
  value = {
    id       = azurerm_resource_group.main.id
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
  }
}

output "repository" {
  description = "Details of the GitHub repository, including ID and name."
  value = {
    id   = var.repository.configure ? module.github_repository.id : null
    name = local.repository_name
  }
}

output "github_private_runner" {
  description = "Details of the GitHub private runner, including ID, name, and resource group name."
  value = {
    id                  = module.github_runner.container_app_job.id
    name                = module.github_runner.container_app_job.name
    resource_group_name = module.github_runner.container_app_job.resource_group_name
  }
}

output "identities" {
  description = "Details of the user-assigned identities for app, infra, and opex, including IDs and names."
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
