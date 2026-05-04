---
title: "DX Terraform Provider for Azure"
ring: adopt
tags: [terraform, azure, dx, tool]
---

The DX Terraform provider for Azure standardizes naming and helper functions for
Azure infrastructure managed with Terraform. It complements DX modules by
providing reusable naming logic and network helpers directly at provider level.

## Use cases

- Generating Azure resource names with DX naming conventions
- Finding available subnet CIDR blocks inside an existing virtual network
- Reducing duplicated naming logic across Terraform configurations

## Reference of usage in our organization

- [Provider README](https://github.com/pagopa/dx/blob/main/providers/azure/README.md)
- [Generated provider documentation](https://github.com/pagopa/dx/blob/main/providers/azure/docs/index.md)
- [Function documentation: resource_name](https://github.com/pagopa/dx/blob/main/providers/azure/docs/functions/resource_name.md)
- [Resource documentation: available_subnet_cidr](https://github.com/pagopa/dx/blob/main/providers/azure/docs/resources/available_subnet_cidr.md)
