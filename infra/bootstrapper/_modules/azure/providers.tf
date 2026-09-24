terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.12"
    }

    hashicorpgithub = {
      source  = "hashicorp/github"
      version = "~> 6.12"
    }
  }
}

provider "github" {
  owner = var.repository.owner
}

provider "hashicorpgithub" {
  owner = var.repository.owner
}
