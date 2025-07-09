---
"azure_function_app": major
---

Update names of storage account private endpoints

### Upgrade Notes

This change updates the names of the Storage Account Private Endpoints created by the module. The change was necessary to avoid conflicts with the Private Endpoints names create by the `azurerm_storage_account` resource. To change the name, it is required to recreate the Private Endpoints following these steps:

- Using Azure Portal, navigate to the Storage Account associated with the Function App
- Remove the lock on the Storage Account if it is present
- Select the `Networking` tab
- Under `Firewalls and Virtual Networks`, select `Enabled from selected virtual networks and IP addresses`
- Tick the option `Add your client IP address ('<ip>')`
- Select `Add existing virtual network`
- Add the Function App's subnet
- Azure Portal will warn to enable service endpoints for the subnet, click `Enable` to proceed
- Click `Add` to add the subnet
- Click `Save` to apply the changes
- Wait for the changes to be applied and propagated (~10 minutes)
- Move to the `Private endpoint connections` section, find the existing Private endpoints (ignore eventual Data Factory associated resources)
- Delete each of them by click on each resource and selecting `Delete`
- Create the Private Endpoints again using the new module. This operation will also restore the configuration changed by Azure Portal
- Disable the service endpoint previously enabled on the Function App's subnet by navigating to the `Subnets` section of the Virtual Network, selecting the Function App's subnet, and unchecking the `Microsoft.Storage` service endpoint
