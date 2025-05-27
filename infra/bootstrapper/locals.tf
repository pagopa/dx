locals {
  environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    app_name        = "core"
    instance_number = "01"
  }

  project = "${local.environment.prefix}-%s-${local.environment.location_short}"

  opex_rg_name = "${local.project}-opex-rg-01"

  adgroups = {
    admins_name   = "dx-%s-adgroup-admin"
    devs_name     = "dx-%s-adgroup-developers"
    external_name = "dx-%s-adgroup-externals"
  }

  common = {
    resource_group_name = "${local.project}-common-rg-01"
  }

  vnet = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }

  tf_storage_account = {
    name                = "dx%s${local.environment.location_short}tfstatest01"
    resource_group_name = "dx-%s-${local.environment.location_short}-tfstate-rg-01"
  }

  repository = {
    name               = "dx"
    description        = "Devex repository for shared tools and pipelines."
    topics             = ["developer-experience"]
    reviewers_teams    = ["engineering-team-devex"]
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/bootstrap"
    ManagementTeam = "Developer Experience"
    TestName       = "Create Azure Github environment bootstrap for test"
  }
}

