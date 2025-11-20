---
sidebar_position: 4
---

# Updating GitHub Actions to deploy settings and secrets within the application

Deploying application settings and secrets to Azure App Configuration can be
automated using GitHub Actions. This ensures that any changes made to the
configuration files in the repository are automatically reflected in the
AppConfiguration instance. This guide provides the necessary commands to
provision settings and secrets to Azure, but you can decide what best fits your
needs within your GitHub Actions workflows. You can either decide to have a
dedicated workflow for this task, or integrate an existing application
deployment workflow to include settings deployment alongside application code
deployment.

What is important to note is:

- secrets and application settings are stored in two different JSON files,
  `secrets.json` and `appsettings.json` respectively; so deployments are
  sequential and separated;
- if you have multiple environments (e.g. dev, prod), each of them should have
  its own file, and can be managed through labels or separate App Configuration
  instances;
- prefixes and labels can be combined to organize configuration data (see
  [Using Prefixes and Labels](#using-prefixes-and-labels) section below);

## Pre-requisites

Before starting, make sure your workflow logs into Azure, and has the following
permissions:

```yaml
permissions:
  contents: read
  id-token: write

jobs:
  deploy-settings:
    name: Deploy AppSettings
    runs-on: self-hosted
    environment: app-dev-cd
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        name: Checkout

      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.ARM_CLIENT_ID }}
          tenant-id: ${{ secrets.ARM_TENANT_ID }}
          subscription-id: ${{ secrets.ARM_SUBSCRIPTION_ID }}
```

## Deploying Application Settings and Feature Flags

Application settings and feature flags can be deployed using az cli command:

```yaml
- uses: azure/cli@v2
  name: "Deploy AppSettings"
  with:
    azcliversion: latest
    inlineScript: |
      az appconfig kv import \
        --name ${{ env.APPCONFIG_NAME }} \
        --auth-mode login \
        --source file \
        --path path/to/appsettings.json \
        --content-type "application/json" \
        --separator : \
        --format json \
        --yes
```

:::warning

Whether hot reload is enabled or not, application settings are deployed before
the newer application version. Therefore, application settings should be
backward-compatible with the current application version to avoid runtime
errors.

:::

## Deploying Secrets

To deploy secrets, use the previous command but with a different `content-type`:

```yaml
- uses: azure/cli@v2
  name: "Deploy Secrets"
  with:
    azcliversion: latest
    inlineScript: |
      az appconfig kv import \
        --name ${{ env.APPCONFIG_NAME }} \
        --auth-mode login \
        --source file \
        --path path/to/secrets.json \
        --content-type "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" \
        --format json \
        --yes
```

## Using Prefixes and Labels

Prefixes and labels are powerful mechanisms to organize configuration data when
sharing a single App Configuration instance across multiple applications,
environments, or versions.

### Prefix: Application Isolation

Use prefixes to separate configuration data for different applications sharing
the same App Configuration instance:

```bash
# Deploy settings for App A
az appconfig kv import \
  --name shared-appconfig \
  --path app-a/appsettings.json \
  ...
  --prefix "app-a:"

# Deploy settings for App B
az appconfig kv import \
  --name shared-appconfig \
  --source file \
  --path app-b/appsettings.json \
  ...
  --prefix "app-b:" \
```

At runtime, each application filters its own configuration:

```typescript
const settings = await load(endpoint, credential, {
  selectors: [{ keyFilter: "app-a:*" }],
  trimKeyPrefixes: ["app-a:"], // Optionally remove prefix from keys
});

console.log(settings.get("Setting1")); // Reads "app-a:Setting1" without prefix
```

### Label: Environment or Version Management

Labels can serve two primary purposes:

#### 1. Environment Separation (Staging vs Production)

```bash
# Deploy to Staging
az appconfig kv import \
  ...
  --path appsettings.Staging.json \
  --label "Staging"

# Deploy to Production
az appconfig kv import \
  ...
  --path appsettings.json \
  --label "Production"
```

Filter by environment at runtime:

```typescript
const environment = process.env.NODE_ENV || "Production";
const settings = await load(endpoint, credential, {
  selectors: [
    {
      keyFilter: "*",
      labelFilter: environment,
    },
  ],
});
```

#### 2. Configuration Versioning

If preferred, labels can be used to version application settings. SemVer, git
commit sha or any other versioning scheme can be used:

```bash
# Deploy version 1.2.0
az appconfig kv import \
  ...
  --path appsettings.json \
  --label "v1.3.0"
```

Code can load the desired version at runtime:

```typescript
const settings = await load(endpoint, credential, {
  selectors: [
    {
      keyFilter: "*",
      labelFilter: "v1.2.0",
    },
  ],
});
```

:::warning

All content matching the current filter criteria (e.g. prefix `app-a:`) is
replaced by the `az appconfig kv import` command. Ensure that multiple
applications or versions do not share the same prefix/label combination to avoid
unintentional overwrites. If you are unsure about the impact of the import,
consider running the command with the `--dry-run` flag first locally or via CI.

:::

### Snapshot and Restore

App Configuration supports creating point-in-time snapshots of your
configuration data, enabling you to:

- **Archive configurations** for compliance or audit purposes
- **Restore previous states** after problematic deployments
- **Track configuration history** with immutable snapshots

Snapshots can be created via **Azure Portal** (Configuration Explorer →
Snapshots), **Azure CLI** (`az appconfig snapshot create`), or REST API, and are
immutable once created. This provides an additional layer of safety beyond
labels for managing configuration changes over time.
