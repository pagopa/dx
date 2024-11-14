locals {
  prefix         = "ps"
  env_short      = "d"
  location       = "italynorth"
  location_short = "itn"

  project = "${local.prefix}-${local.env_short}-${local.location_short}"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "IO"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/it-wallet"
  }
}
