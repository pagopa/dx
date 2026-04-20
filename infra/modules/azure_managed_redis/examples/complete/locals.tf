locals {
  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_managed_redis/examples/complete"
  }

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "example"
    app_name        = "amr"
    instance_number = "01"
  }

  subnet_pep_id                        = null
  private_dns_zone_resource_group_name = null
  log_analytics_workspace_id           = null
  action_group_id                      = null
  cmk_key_vault_key_id                 = null
  cmk_user_assigned_identity_id        = null
  geo_replication_linked_ids           = []
}
