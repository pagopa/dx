terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.repository.tfstate"
    use_azuread_auth     = true
  }
}

provider "github" {
  owner = "pagopa"
}
