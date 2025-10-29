---
id: "generate-terraform-configuration"
title: "Generate Terraform Configuration"
description: "Generates a Terraform configuration following PagoPA DX best practices. Guides users through querying the knowledge base for folder structure, modules, and conventions."
category: "terraform"
enabled: true
tags: ["terraform", "infrastructure", "dx"]
examples:
  - "Generate a Terraform configuration for an Azure Function App"
  - "Create infrastructure for a new microservice with API Management"
arguments:
  - name: "requirements"
    description: "Requirements for the Terraform configuration to generate."
    required: false
    default: "any requirement"
mode: "agent"
tools: ["QueryPagoPADXDocumentation", "searchModules", "getProviderDocs"]
---

To generate a Terraform configuration for {{requirements}}, you must follow the PagoPA DX best practices.

You can find information about the "infrastructure folder structure", "Using DX terraform modules", "Using DX terraform provider" and other conventions by using the `QueryPagoPADXDocumentation` tool. For example, you can ask "what is the infrastructure folder structure?". You can ask for the other information you may need as well.
It's suggested to call the `QueryPagoPADXDocumentation` tool multiple times to gather all the necessary information using simple and scoped questions.

When generating the configuration, remember to:

1. Always use existing Terraform modules from the `pagopa-dx` namespace for cloud resources you have to create (for example azure storage account use the terraform module pagopa-dx/azure-storage-account/azurerm). You can search for them using the `searchModules` tool.
2. Always use the dx providers' functions and resources to set the name of cloud resources (using the resource_name function) and to set subnets cidrs (using the dx_available_subnet_cidr resource). You can search for them using the `getProviderDocs` tool.
3. Strictly follow the correct folder structure for infrastructure resources.
4. Generate HCL code that is clean, readable, and well-documented.
