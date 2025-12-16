terraform {
  required_providers {
    azapi = {
      source = "Azure/azapi"
    }

    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }

  }
}
