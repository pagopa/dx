---
sidebar_position: 1
sidebar_label: Azure Naming Convention
---

# Azure Naming Convention

Having a naming convention for your Azure resources is critical to quickly identifying the resource type, associated workload, environment, and Azure region it is located in. By following a consistent format, you can include all the information needed to identify specific resource instances.

A good naming convention should capture key data about each resource, ensuring that the name is unique within its scope, defined by the resource type. This makes it easier to manage and organize resources within your enterprise infrastructure.

---

The naming convention to follow is described as follows:

`<prefix>-<region>-[domain]-[appname]-<resource-type>-<instance-number>`

- `prefix`: the currently used prefix, containing the project name and environment (e.g. `io-p`)
- `region`: the region where the resource was created, in 3 letters (only valid values: `weu`, `neu`, `itn`, `gwc`)
- `domain`: (Optional) the domain to which the resource refers (e.g. `wallet`, `svc`, `msgs`). Omit for common resources (e.g. Application Gateway)
- `appname`: (Optional) The application name of the resource (e.g. `session-manager`, `cms`). __Omit only if you are creating a unique resource of its type__ (e.g. APIM, Application Gateway, WAF). __In the vast majority of cases, this field should be used__
- `resource-type`: the name of the service you are using. Get the name only from [Microsoft documentation](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations), do not use patterns out of habit (es. `fn` for Function App)
- `instance-number`: a two-digit number, to enumerate the resources (e.g. `01`, `02`, etc.)

The Terraform modules in the DevEx repository help you follow this pattern by automatically composing the names of your resources.
