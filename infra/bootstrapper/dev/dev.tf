module "bootstrapper" {
  source = "../_modules/bootstrapper"

  environment = local.environment

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }

  repository = {
    name            = "dx"
    configure       = true
    description     = "Devex repository for shared tools and pipelines."
    topics          = ["developer-experience"]
    reviewers_teams = ["engineering-team-devex"]
  }

  tags = local.tags
}
