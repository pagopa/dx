locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    location_short  = "itn"
    domain          = "test"
    app_name        = "monorepo_starter_pack"
    instance_number = "02"
  }

  project = "${local.environment.prefix}-${local.environment.env_short}-${local.environment.location_short}"

  adgroups = {
    admins_name   = "${local.environment.prefix}-${local.environment.env_short}-adgroup-admin"
    devs_name     = "${local.environment.prefix}-${local.environment.env_short}-adgroup-developers"
    external_name = "${local.environment.prefix}-${local.environment.env_short}-adgroup-externals"
  }

  runner = {
    cae_name                = "${local.project}-github-runner-cae-01"
    cae_resource_group_name = "${local.project}-github-runner-rg-01"
    secret = {
      kv_name                = "${local.project}-common-kv-01"
      kv_resource_group_name = "${local.project}-common-rg-01"
    }
  }

  common = {
    resource_group_name = "${local.project}-common-rg-01"
  }

  vnet = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }

  tf_storage_account = {
    name                = "tfdevdx"
    resource_group_name = "terraform-state-rg"
  }

  repository = {
    name               = "dx-test-monorepo-starter-pack"
    description        = "Devex repository for shared tools and pipelines."
    topics             = ["developer-experience"]
    reviewers_teams    = ["engineering-team-cloud-eng"]
    app_cd_policy_tags = ["release/"]
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_github_environment_bootstrap/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create Azure Github environment bootstrap for test"
  }
}

