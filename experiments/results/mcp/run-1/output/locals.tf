locals {
  # Environment configuration
  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = var.app_name
    instance_number = var.instance_number
  }

  # Virtual Network configuration
  virtual_network = {
    name                = var.virtual_network_name
    resource_group_name = var.virtual_network_resource_group_name
  }

  # Required tags for all resources
  tags = {
    CostCenter     = var.cost_center
    CreatedBy      = "Terraform"
    Environment    = var.env_short == "p" ? "Prod" : var.env_short == "u" ? "Uat" : "Dev"
    BusinessUnit   = var.business_unit
    Source         = var.source_repository
    ManagementTeam = var.management_team
  }

  # Resource names using DX provider naming convention
  resource_group_name = provider::dx::resource_name({
    prefix          = var.prefix
    environment     = var.env_short
    location        = var.location
    domain          = var.domain
    name            = var.app_name
    resource_type   = "resource_group"
    instance_number = var.instance_number
  })
}
