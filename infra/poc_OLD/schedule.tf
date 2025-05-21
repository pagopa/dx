# # --------------------------------------
# # Schedule for periodic execution
# # --------------------------------------
# resource "azurerm_automation_schedule" "weekly_run" {
#   name                    = "SaveMoneyWeeklyRun"
#   resource_group_name     = local.resource_group_name
#   automation_account_name = azurerm_automation_account.save_money.name
#   frequency               = "Week"
#   interval                = 1
#   start_time              = timeadd(timestamp(), "168h") # Starts in one week
#   description             = "Weekly schedule for running the MarkUnusedResourcesWhatIf runbook"
#   timezone                = "Europe/Rome"
#   week_days               = ["Thursday"] # Runs every Thursday
# }

# # --------------------------------------
# # Link schedule to runbook
# # --------------------------------------
# resource "azurerm_automation_job_schedule" "save_money_job" {
#   resource_group_name     = local.resource_group_name
#   automation_account_name = azurerm_automation_account.save_money.name
#   schedule_name           = azurerm_automation_schedule.weekly_run.name
#   runbook_name            = azurerm_automation_runbook.mark_unused_resources.name # azurerm_automation_runbook.save_money_script.name

#   # parameters = {
#   #   tenantid                                   = data.azurerm_subscription.current.tenant_id
#   #   subscriptionidstoprocess                   = "@(${data.azurerm_subscription.current.subscription_id})"
#   #   automationaccountresourceid                = azurerm_automation_account.save_money.id
#   #   alwaysonlymarkfordeletion                  = true
#   #   enableregularresetofrejectedstate          = true
#   #   resetofrejectedstateperiodindays           = 180
#   #   deletesuspectedresourcesandgroupsafterdays = 30
#   #   minimumresourceageindaysforchecking        = 7
#   #   dontdeleteemptyresourcegroups              = true
#   # }
# }
