locals {
  environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    domain          = "test"
    instance_number = "02"
  }

  project = "${local.environment.prefix}-%s-${local.environment.location_short}"

  adgroups = {
    admins_name   = "io-d-adgroup-admin"
    devs_name     = "io-p-adgroup-developers"
    external_name = "io-p-adgroup-externals"
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
    name                = "tf%sdx"
    resource_group_name = "terraform-state-rg"
  }

  repository = {
    name               = "dx-test-monorepo-starter-pack"
    reviewers_teams    = ["engineering-team-cloud-eng"]
    app_cd_policy_tags = ["release/"]
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_github_environment_bootstrap/examples/multi-environment"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create Azure Github environment bootstrap for test"
  }
}

