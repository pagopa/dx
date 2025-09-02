# Creating a new TLS certificate

## Overview

Creating and managing a TLS certificate can be a demanding and challenging task
for developers who want to quickly create a new hostname for their applications.
This guide provides step-by-step instructions on how to add a new TLS
certificate and its automatic renewal pipeline using a combination of tools such
as Terraform, PowerShell and Azure KeyVault.

## How-To Create a new TLS Certificate

:::warning

This section shows how to create an Azure DevOps pipeline via Terraform. The
DevEx team is working on a simpler, reusable GitHub workflow which will replace
this soon.

:::

An Azure DevOps pipeline capable of creating and renewing TLS certificates is
available as Terraform module
(`azuredevops_build_definition_tls_cert_federated`) in the repository
[pagopa/azuredevops-tf-modules](https://github.com/pagopa/azuredevops-tf-modules).

This workflow uses managed identities to access the given KeyVault, checks if
the given certificate exists or is expiring soon, and if so, requests a new
certificate from Let's Encrypt using the ACME protocol.

This pipeline should run on a schedule, for example every week, to ensure that
certificates will never expire.

However, things may go wrong: for this reason it is essential to add an alert in
case of pipeline failure. To add the alert:

- navigate to DevOps project setting by clicking on the gear in the bottom-left
  corner
- select `Notifications`
- click on `New subscription`
- select `A build fails` in `Build` category
- in `Develiver to`, select `Custom email address` and add the email of the team
  responsible for the maintenance of the certificate; you could also set a
  Slack's group email
- click on `Finish`

:::warning

Due to a bug within the Azure DevOps Terraform provider, the scheduled trigger
will not work until the first edit of the pipeline is done manually in the Azure
DevOps portal.

To work around this, once the pipeline is created, navigate to the pipeline in
the Azure DevOps portal, click on `Edit`, then on the three dots in the
top-right corner and do a random change (e.g. changing the scheduled trigger
time) and save the pipeline. Eventually, revert the random change back if
needed.

:::
