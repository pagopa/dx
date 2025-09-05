locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    region          = "eu-south-1"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/aws_open_next/examples/basic"
    ManagementTeam = "Developer Experience"
  }

  dns_domain_name = "opxt.dx.pagopa.it"
  hosted_zone_id  = "Z02428843GYZP1RTAE2EQ"
}
