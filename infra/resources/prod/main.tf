terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfproddx"
    container_name       = "terraform-state"
    key                  = "dx.resources.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

provider "azurerm" {
  alias = "prod-io"
  features {
  }
  subscription_id     = local.prod-io
  storage_use_azuread = true
}

resource "azurerm_role_definition" "pagopa_opex_contributor" {
  name        = "PagoPA Opex Dashboards Contributor"
  scope       = data.azurerm_subscription.prod-io.id
  description = "Role to manage the Opex Dashboards creation, modification and deletion"

  permissions {
    actions = [
      "Microsoft.Portal/dashboards/write",
      "Microsoft.Portal/dashboards/read",
      "Microsoft.Portal/dashboards/delete",
    ]
    not_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.prod-io.id,
    data.azurerm_subscription.dev-engineering.id,
  ]
}
