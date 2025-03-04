---
"azure_api_management": major
---

Replace `instrumentation_key` with `connection_string` to connect Application Insights


**Migration Guide**

Update the `application_insights` block by replacing the `instrumentation_key` with the `connection_string` parameter.

From this:
```
module "apim" {
  source  = "pagopa/dx-azure-api-management/azurerm"
  ...
  application_insights = {
    enabled             = true
    instrumentation_key = "<the-ai-instrumentation-key>"
  }
}
```
to this:
```
module "apim" {
  source  = "pagopa/dx-azure-api-management/azurerm"
  ...
  application_insights = {
    enabled           = true
    connection_string = "<the-ai-connection-string>"
  }
}
```
