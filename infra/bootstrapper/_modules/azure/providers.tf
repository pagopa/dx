terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }
  }
}

provider "github" {
  owner = var.repository.owner
}
