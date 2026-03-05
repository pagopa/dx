terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "http" {
    address = "https://stategraph.dev.dx.pagopa.it/api/v1/states/backend/4a7c9de0-24e2-4d76-8dc9-5c3775a9d87f"
  }
}

# GitHub provider configuration
provider "github" {
  owner = "pagopa"
}
