locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    name            = "ghrpat"
    instance_number = "01"
  }


  shared_testing_config = {
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = ""
    name            = "e2e"
    instance_number = 1
  }

  github_repository = "dx"

  github_runner_pat_placeholder = "placeholder-pat-for-e2e"
  runner_label                  = "e2e-github-selfhosted-runner-pat"

  tags = {
    BusinessUnit   = "DeveloperExperience"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/github_selfhosted_runner_on_container_app_jobs/examples/pat_based"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "GitHub Self-Hosted Runner PAT e2e"
  }
}
