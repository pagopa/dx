---
sidebar_position: 1
---

# Getting started with your NodeJS application and Azure App Configuration

This page gives you the absolute minimum to get a Node.js service loading
settings, feature flags and secrets (via Key Vault) from Azure App
Configuration. Copy the snippets, adapt names, and you can run immediately.

## 1. Install Dependencies

```bash
pnpm add @azure/app-configuration @azure/identity
```

## 2. Minimal Node.js Integration

The snippet below shows:

- Authentication using `DefaultAzureCredential`
- Loading a configuration snapshot with a simple refresh mechanism driven by a
  Sentinel key
- Reading an appsetting
- Fetching and evaluating a feature flag
- Resolving a Key Vault secret reference

```typescript
import { load } from "@azure/app-configuration-provider);
import { DefaultAzureCredential } from "@azure/identity";
const endpoint = process.env.AZURE_APPCONFIG_ENDPOINT;
const credential = new DefaultAzureCredential();

async function run() {
  console.log("Sample 1: Load key-values");

  const settings = await load(endpoint, credential);

  // Find the key "message" and print its value.
  console.log(settings.get("message"));
  // Find the key "app.json" whose value is an object.
  console.log(settings.get("app.json")); // { myKey: 'myValue' }

  console.log("---Consume configuration as an object---");
  // Construct configuration object from loaded key-values, by default "." is used to separate hierarchical keys.
  const config = settings.constructConfigurationObject();
  console.log(config.message);
  console.log(config.app.greeting);
  console.log(config.app.json); // { myKey: 'myValue' }

  console.log("---Resolve secret references---");
  console.log(settings.get("ApiKey"));
}

run().catch(console.error);
```

### 2.1. Enabling auto-refresh

Settings can be refresh automatically:

```typescript
const appConfig = await load(endpoint, credential, {
  refreshOptions: {
    enabled: true,
    refreshIntervalInMs: 300000, // 5 minutes
  },
});
```

### 2.2. Filtering keys by prefix

By default, the entire configuration is loaded. However, it can be filtered by
patterns:

```typescript
const settings = await load(endpoint, credential, {
  selectors: [
    {
      keyFilter: "app.*",
    },
  ],
  trimKeyPrefixes: ["app."], // optional, to remove the prefix from keys at runtime
});

console.log(settings.has("message")); // false
console.log(settings.has("app.greeting")); // true without trimKeyPrefixes, false otherwise
console.log(settings.get("greeting")); // false without trimKeyPrefixes, true otherwise
```

## 3. Reading feature flags

Usage example:

```typescript
async function run() {
  const appConfig = await load(endpoint, credential, {
    featureFlagOptions: {
      enabled: true,
      refresh: {
        enabled: true,
        refreshIntervalInMs: 10_000,
      },
    },
  });

  const fm = new FeatureManager(
    new ConfigurationMapFeatureFlagProvider(appConfig),
  );

  const isEnabled = await fm.isEnabled("Beta");
  console.log(`Beta is enabled: ${isEnabled}`);
}
```
