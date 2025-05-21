# --------------------------------------
# Upload script as resource
# --------------------------------------

data "local_file" "save_money_script" {
  filename = "${path.module}/../scripts/MarkAndDeleteUnusedResources.ps1"
}

resource "azurerm_automation_runbook" "save_money_script" {
  name                    = "MarkAndDeleteUnusedResourcesScript"
  location                = local.naming_config.location
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name
  log_verbose             = true
  log_progress            = true
  description             = "Script for identifying unused Azure resources"
  runbook_type            = "PowerShell72"

  content = data.local_file.save_money_script.content

  tags = local.tags
}

# --------------------------------------
# Runbook PowerShell
# --------------------------------------
resource "azurerm_automation_runbook" "mark_unused_resources" {
  name                    = "MarkUnusedResourcesWhatIf"
  location                = local.naming_config.location
  resource_group_name     = local.resource_group_name
  automation_account_name = azurerm_automation_account.save_money.name
  log_verbose             = true
  log_progress            = true
  description             = "Marks unused Azure resources in WhatIf mode"
  runbook_type            = "PowerShell72"

  content = <<-EOF
# Login con Managed Identity
Connect-AzAccount -Identity

Write-Output "Starting Azure Save Money script in WhatIf mode..."

# Get Automation Account information
$AutomationAccountResourceId = Get-AutomationVariable -Name 'AutomationAccountResourceId' -ErrorAction SilentlyContinue
if (-not $AutomationAccountResourceId) {
    $AutomationAccountResourceId = $PSPrivateMetadata.JobId.Split('/')[0..8] -join '/'
    Write-Output "Derived Automation Account ID: $AutomationAccountResourceId"
}

# Parameters from Automation Variables
$TenantId = Get-AutomationVariable -Name "TenantId"
$SubscriptionIdString = Get-AutomationVariable -Name "SubscriptionIdsToProcess"
$SubscriptionIdsToProcess = $SubscriptionIdString -split ","

# Hardcoded/test parameters
$MinimumResourceAgeInDaysForChecking = 7
$DeleteSuspectedResourcesAndGroupsAfterDays = 30
$ResetOfRejectedStatePeriodInDays = 180

# Imposta le variabili locali per nome account e gruppo risorse
$runbookName = "MarkAndDeleteUnusedResourcesScript"
$resourceGroup = "${local.resource_group_name}"
$automationAccount = "${azurerm_automation_account.save_money.name}"

$parametersToPass = @{
    "TenantId" = $TenantId
    "AutomationAccountResourceId" = $AutomationAccountResourceId
    "SubscriptionIdsToProcess" = $SubscriptionIdsToProcess
    "MinimumResourceAgeInDaysForChecking" = $MinimumResourceAgeInDaysForChecking
    "DeleteSuspectedResourcesAndGroupsAfterDays" = $DeleteSuspectedResourcesAndGroupsAfterDays
    "ResetOfRejectedStatePeriodInDays" = $ResetOfRejectedStatePeriodInDays
    "DontDeleteEmptyResourceGroups" = $true
    "AlwaysOnlyMarkForDeletion" = $true
    "EnableRegularResetOfRejectedState" = $true
}

# Avvia il runbook secondario passando i parametri
Start-AzAutomationRunbook `
  -ResourceGroupName $resourceGroup `
  -AutomationAccountName $automationAccount `
  -Name $runbookName `
  -Parameters $parametersToPass

Write-Output "Started runbook '$runbookName' from wrapper successfully."
EOF

  tags = local.tags

  depends_on = [azurerm_automation_runbook.save_money_script]
}


# # Login con Managed Identity
# Connect-AzAccount -Identity

# # Script to identify and mark unused Azure resources
# Write-Output "Starting Azure Save Money script in WhatIf mode..."

# # Get Automation Account information
# $AutomationAccountResourceId = Get-AutomationVariable -Name 'AutomationAccountResourceId' -ErrorAction SilentlyContinue
# if (-not $AutomationAccountResourceId) {
#     $AutomationAccountResourceId = $PSPrivateMetadata.JobId.Split('/')[0..8] -join '/'
#     Write-Output "Derived Automation Account ID: $AutomationAccountResourceId"
# }

# # Parameters from Automation Variables
# $TenantId = Get-AutomationVariable -Name "TenantId"
# $SubscriptionIdString = Get-AutomationVariable -Name "SubscriptionIdsToProcess"
# $SubscriptionIdsToProcess = $SubscriptionIdString -split ","

# # Hardcoded/test parameters
# $MinimumResourceAgeInDaysForChecking = 7
# $DeleteSuspectedResourcesAndGroupsAfterDays = 30
# $ResetOfRejectedStatePeriodInDays = 180

# # Get access token
# $token = (Get-AzAccessToken).Token
# $headers = @{ Authorization = "Bearer $token" }

# # Get the content of the runbook (published content)
# $runbookName = "MarkAndDeleteUnusedResourcesScript"
# $subscriptionId = "${data.azurerm_subscription.current.subscription_id}"
# $resourceGroup = "${local.resource_group_name}"
# $automationAccount = "${azurerm_automation_account.save_money.name}"
# $uri = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.Automation/automationAccounts/$automationAccount/runbooks/$runbookName/content?api-version=2023-11-01"

# try {
#     $runbookContent = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET
#     $tempScriptPath = Join-Path -Path $env:TEMP -ChildPath "$runbookName.ps1"
#     Set-Content -Path $tempScriptPath -Value $runbookContent -Encoding UTF8
#     Write-Output "Runbook script saved to: $tempScriptPath"

#     # Execute the runbook script
#     & $tempScriptPath -WhatIf `
#         -TenantId $TenantId `
#         -AutomationAccountResourceId $AutomationAccountResourceId `
#         -AlwaysOnlyMarkForDeletion `
#         -MinimumResourceAgeInDaysForChecking $MinimumResourceAgeInDaysForChecking `
#         -DeleteSuspectedResourcesAndGroupsAfterDays $DeleteSuspectedResourcesAndGroupsAfterDays `
#         -DontDeleteEmptyResourceGroups `
#         -EnableRegularResetOfRejectedState `
#         -ResetOfRejectedStatePeriodInDays $ResetOfRejectedStatePeriodInDays `
#         -SubscriptionIdsToProcess $SubscriptionIdsToProcess
# } catch {
#     Write-Error "Failed to retrieve or run the runbook content: $_"
# }

# Write-Output "Azure Save Money script execution completed"