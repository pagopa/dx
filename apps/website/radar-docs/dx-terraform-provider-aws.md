---
title: "DX Terraform Provider for AWS"
ring: adopt
tags: [terraform, aws, dx, tool]
---

The DX Terraform provider for AWS standardizes naming and helper functions for
AWS infrastructure managed with Terraform. It offers DX-specific conventions at
provider level so repositories can keep naming logic and subnet allocation
helpers consistent.

## Use cases

- Generating AWS resource names with DX naming conventions
- Finding available subnet CIDR blocks inside an existing VPC
- Centralizing reusable infrastructure naming rules in Terraform code

## Reference of usage in our organization

- [Provider README](https://github.com/pagopa/dx/blob/main/providers/aws/README.md)
- [Generated provider documentation](https://github.com/pagopa/dx/blob/main/providers/aws/docs/index.md)
- [Function documentation: resource_name](https://github.com/pagopa/dx/blob/main/providers/aws/docs/functions/resource_name.md)
- [Resource documentation: available_subnet_cidr](https://github.com/pagopa/dx/blob/main/providers/aws/docs/resources/available_subnet_cidr.md)
