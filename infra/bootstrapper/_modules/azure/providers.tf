terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }

  }
}

provider "github" {
  owner = var.repository.owner
}
