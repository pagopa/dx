---
sidebar_position: 1
sidebar_label: Azure Naming Convention
---

# Azure Naming Convention

Having a naming convention for your Azure resources is critical for quickly
identifying the resource type, associated workload, environment, and Azure
region it is located in. By following a consistent format, you can include all
the information needed to identify specific resource instances.

A good naming convention should capture key data about each resource, ensuring
that the name is unique within its scope, defined by the resource type. This
makes it easier to manage and organize resources within your enterprise
infrastructure.

---

The following is a description of the naming convention to be followed:

`<prefix>-<region>-[domain]-[appname]-<resource-type>-<instance-number>`

- `prefix`: The currently used prefix, which includes the product name and
  environment (e.g., `io-p`).
- `region`: The region where the resource was created, represented by a 3-letter
  code (valid values: `weu`, `neu`, `itn`, `gwc`).
- `domain`: (Optional) The domain to which the resource is associated (e.g.,
  `wallet`, `svc`, `msgs`). Omit this field for _shared_ resources (e.g.,
  Application Gateway).
- `appname`: (Optional) The application name of the resource (e.g.,
  `session-manager`, `cms`). Only omit this field if you are creating a unique
  resource of its type (e.g., APIM, Application Gateway, WAF). In most cases,
  this field should be used.
- `resource-type`: The name of the service you are using. Refer to the
  [Microsoft documentation](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations)
  for the correct name. Do not use patterns out of habit (e.g., `fn` for
  Function App).
- `instance-number`: A two-digit number used to enumerate the resources (e.g.,
  `01`, `02`, etc.).

The Terraform modules in the DX repository help you follow this pattern by
automatically composing the names of your resources.
