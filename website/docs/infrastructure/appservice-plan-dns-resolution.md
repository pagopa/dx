---
sidebar_label: Ensuring an Online Service is Reachable from an App Service Plan
---

# Ensuring an Online Service is Reachable from an App Service Plan

When updating connection configurations for an App Service or Function App in production, targeting downstream services like CosmosDB or Event Hub, verify the networking configuration before changing environment variable values.

## Prerequisites

- Access to the App Service Plan
- VPN connection (for production environments)

## Step-by-Step Guide

1. Connect to SCM Console
    - Locate the specific App Service or Function App
    - Connect to the VPN (Production environments only)
    - Access SCM console: https://&lt;app-name&gt;.scm.azurewebsites.net
2. Access SSH Tab
3. Install DNS Tools
    - Run `apt install dnsutils`
4. Resolve Hostname
    - Use `nslookup` to check DNS resolution:
    - **Examples**
      - CosmosDB: `nslookup <cosmosdb-account-name>.documents.azure.com`
      - AppService/ FunctionApp: `nslookup io-p-sign-user-func.azurewebsites.net`
5. Verify Results
    - Check the output IP address
    - Confirm it matches the Private Endpoint IP in the Azure Portal's Networking blade

## Key Recommendations

- Always verify network connectivity before changing service configurations
- Use nslookup to quickly check DNS resolution
