---
sidebar_position: 5
---

# Updating Opex Dashboards and Alerts with new Application Gateway

Opex dashboards and alerts are used to monitor the performance and health of
Azure Application Gateways. However, when a new Application Gateway is created,
the existing dashboards and alerts do not automatically update to replace the
old Application Gateway with the new one. This may lead to unused alerts and
empty dashboards.

In order to replace the Application Gateway instance, dashboards and alerts must
be recreated, as it is not possible to update the `Scope` property of existing
alerts.

This guide explains how to safely delete and recreate Opex dashboards and alerts
when migrating to a new Azure Application Gateway.

## Steps to Recreate Dashboards and Alerts

Unlike any other Terraform resource, Opex dashboards and alerts are created
using a custom Python application, and therefore Terraform source code is not
available to the user. Therefore, the quickest way to delete programmatically
existing dashboards and alerts is to create an empty Terraform configuration and
apply it. This action will remove all existing dashboards and alerts, allowing
you to recreate them with the new Application Gateway.

1. Create a new directory for an empty Terraform configuration:

```bash
mkdir empty-terraform-config
cd empty-terraform-config
```

2. Note the backend configuration of your Opex Terraform state. This is
   typically found in the `backend.tfvars` file of the Opex configuration you
   are migrating. This information is necessary for the next step.

:::warning

Be careful. Setting the wrong values could lead to the deletion of unwanted
resources. **Double-check that your backend configuration matches the Opex state
only.**

:::

3. Create a new file named `main.tf` with the following content:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "<your-resource-group-name>"
    storage_account_name = "<your-storage-account-name>"
    container_name       = "<your-container-name>"
    key                  = "<your-terraform-state-file-name>"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}
```

4. Replace the placeholders in the `backend` block with the actual values you
   noted in step 2.

5. Generate a Terraform plan to a file using the command:

```bash
terraform plan -no-color > tf.plan
```

6. Check the generated plan file to ensure that it only contains the deletion of
   your Opex dashboard and alerts. **Do not proceed if other resources are
   listed for deletion.**

> _A correct plan should only show deletions for Opex dashboards and alerts.
> Example:_
>
> ```hcl
> # azurerm_monitor_scheduled_query_rules_alert.alarm_availability_0 will be destroyed
> # (because azurerm_monitor_scheduled_query_rules_alert.alarm_availability_0 is not in configuration)
> - resource "azurerm_monitor_scheduled_query_rules_alert" "alarm_availability_0" {
> [...]
> # azurerm_portal_dashboard.this will be destroyed
> # (because azurerm_portal_dashboard.this is not in configuration)
> - resource "azurerm_portal_dashboard" "this" {
> ```

6. If the plan looks correct, apply it using the command:

```bash
terraform apply tf.plan
```

7. After applying the empty configuration, all existing Opex dashboards and
   alerts will be deleted. You can now update your Opex configuration with the
   new Application Gateway id and run the GitHub Actions workflow to recreate
   dashboards and alerts.

:::info

Because of a limitation in the dashboard-generating application, the Opex
resources will always be created in the location of the resource group
`dashboards`.

:::
