module "bootstrapper" {
  source = "../_modules/bootstrapper"

  environment = local.environment

  core_state = {
    resource_group_name  = "dx-p-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.prod.tfstate"
  }

  repository = {
    name                   = "dx"
    configure              = false
    description            = "Devex repository for shared tools and pipelines."
    topics                 = ["developer-experience"]
    reviewers_teams        = ["engineering-team-devex"]
    pages_enabled          = true
    has_downloads          = true
    has_projects           = true
    has_issues             = true
    homepage_url           = "https://pagopa.github.io/dx/docs/"
    pull_request_bypassers = ["/dx-pagopa-bot"]
  }

  tags = local.tags
}
