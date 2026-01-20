# provider "azurerm" {
#   features {}
# }

# provider "pagopa-dx" {}

# variables {
#   test_kind = "integration"

#   environment = {
#     prefix          = "dx"
#     env_short       = "d"
#     location        = "italynorth"
#     domain          = "integration"
#     app_name        = "cdb"
#     instance_number = "01"
#   }

#   tags = {
#     CostCenter     = "TS000 - Tecnologia e Servizi"
#     CreatedBy      = "Terraform"
#     Environment    = "Dev"
#     BusinessUnit   = "DevEx"
#     Source         = "https://github.com/pagopa/dx/modules/azure_cosmos_account/tests"
#     ManagementTeam = "Developer Experience"
#   }

#   primary_geo_location = {
#     location       = "italynorth"
#     zone_redundant = true
#   }

#   consistency_policy = {
#     consistency_preset      = "Custom"
#     consistency_level       = "BoundedStaleness"
#     max_interval_in_seconds = 300
#     max_staleness_prefix    = 100000
#   }
# }

# run "setup" {
#   module {
#     source = "./tests/setup"
#   }

#   variables {
#     environment = var.environment
#     tags        = var.tags
#   }
# }

# run "apply_default" {
#   command = apply

#   variables {
#     environment                          = var.environment
#     tags                                 = var.tags
#     primary_geo_location                 = var.primary_geo_location
#     resource_group_name                  = run.setup.resource_group_name
#     subnet_pep_id                        = run.setup.pep_id
#     private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
#     alerts                               = { enabled = false }
#     use_case                             = "default"
#     consistency_policy                   = var.consistency_policy
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.kind == "GlobalDocumentDB"
#     error_message = "Cosmos DB kind must be GlobalDocumentDB"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
#     error_message = "Automatic failover must be enabled"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.offer_type == "Standard"
#     error_message = "Offer type must be Standard"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
#     error_message = "Consistency policy must be BoundedStaleness"
#   }

#   assert {
#     condition     = azurerm_private_endpoint.sql[0].private_service_connection[0].subresource_names[0] == "Sql"
#     error_message = "Private Endpoint subresource must be 'Sql'"
#   }

#   assert {
#     condition     = can(regex("/privateDnsZones/privatelink\\.documents\\.azure\\.com$", azurerm_private_endpoint.sql[0].private_dns_zone_group[0].private_dns_zone_ids[0]))
#     error_message = "Private DNS Zone Group must reference privatelink.documents.azure.com"
#   }

#   assert {
#     condition     = azurerm_private_endpoint.sql[0].subnet_id == run.setup.pep_id
#     error_message = "Private Endpoint must use the setup subnet"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.resource_group_name == run.setup.resource_group_name
#     error_message = "Cosmos resource_group_name must match setup RG"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous" && azurerm_cosmosdb_account.this.backup[0].tier == "Continuous30Days"
#     error_message = "Backup policy must be Continuous/Continuous30Days"
#   }
# }

# run "apply_serverless" {
#   command = apply

#   variables {
#     environment                          = merge(var.environment, { app_name = "cdb-svl" })
#     tags                                 = var.tags
#     primary_geo_location                 = var.primary_geo_location
#     resource_group_name                  = run.setup.resource_group_name
#     subnet_pep_id                        = run.setup.pep_id
#     private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
#     alerts                               = { enabled = false }
#     use_case                             = "development"
#     consistency_policy                   = var.consistency_policy
#   }

#   assert {
#     condition     = [for c in azurerm_cosmosdb_account.this.capabilities : c.name][0] == "EnableServerless"
#     error_message = "Serverless capability must be enabled for development use_case"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.default_identity_type == "FirstPartyIdentity"
#     error_message = "Default identity type should be FirstPartyIdentity when CMK is disabled"
#   }

#   assert {
#     condition     = length(azurerm_cosmosdb_account.this.identity) == 0
#     error_message = "No user-assigned identity expected when CMK disabled"
#   }

#   assert {
#     condition     = azurerm_private_endpoint.sql[0].private_service_connection[0].subresource_names[0] == "Sql"
#     error_message = "Private Endpoint subresource must be 'Sql'"
#   }

#   assert {
#     condition     = can(regex("/privateDnsZones/privatelink\\.documents\\.azure\\.com$", azurerm_private_endpoint.sql[0].private_dns_zone_group[0].private_dns_zone_ids[0]))
#     error_message = "Private DNS Zone Group must reference privatelink.documents.azure.com"
#   }
# }

# run "apply_cmk" {
#   command = apply

#   variables {
#     environment                          = merge(var.environment, { app_name = "cdb-cmk" })
#     tags                                 = var.tags
#     primary_geo_location                 = var.primary_geo_location
#     resource_group_name                  = run.setup.resource_group_name
#     subnet_pep_id                        = run.setup.pep_id
#     private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
#     alerts                               = { enabled = false }
#     use_case                             = "default"
#     consistency_policy                   = var.consistency_policy

#     customer_managed_key = {
#       enabled                   = true
#       user_assigned_identity_id = run.setup.uai_id
#       key_vault_key_id          = run.setup.kv_key_id
#     }
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.identity[0].type == "UserAssigned"
#     error_message = "CMK requires UserAssigned identity type"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.key_vault_key_id == run.setup.kv_key_id
#     error_message = "Cosmos must reference the provided Key Vault key"
#   }

#   assert {
#     condition     = contains(azurerm_cosmosdb_account.this.identity[0].identity_ids, run.setup.uai_id)
#     error_message = "User-assigned identity must be attached to Cosmos"
#   }

#   assert {
#     condition     = azurerm_cosmosdb_account.this.default_identity_type == "UserAssignedIdentity=${run.setup.uai_id}"
#     error_message = "default_identity_type must reference the UAI"
#   }
# }
