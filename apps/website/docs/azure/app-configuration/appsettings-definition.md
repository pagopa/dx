---
sidebar_position: 3
---

# Defining Application Settings, Secrets and Feature Flags

Application settings, secrets and feature flags can be defined in a JSON file,
which can be stored alongside the application code in the repository. This file
will be used to import the configuration data into the Azure App Configuration
instance. In particular, two JSON files should be created:

- `secrets.json`: This file contains sensitive data that should be stored in
  Azure KeyVault.
- `appsettings.json`: This file contains application settings and feature flags.

```bash
src/
├── appsettings.json # Production (or shared baseline)
├── secrets.json     # Prod secrets (KV references)
```

## Defining Secrets

Secrets must be configured with a reference to the KeyVault as follows:

```json
// secrets.json

{
  "my-api-key": {
    "uri": "https://<kv-name>.vault.azure.net/secrets/<my-secret-api-key>"
  }
}
```

:::warning

The key name stored in AppConfiguration and the secret name in KeyVault don't
necessarily match. The application has to access the secret via the key name
defined in AppConfiguration, `my-api-key` in the example above. However, it is
suggested to keep them aligned to avoid confusion.

:::

:::info

The key `uri` is mandatory, and cannot be changed.

:::

## Defining Application Settings and Feature Flags

The syntax for defining application settings and feature flags is as follows:

```json
// appconfig.json
{
  "Sentinel": 0, // Mandatory to manage hot reload

  // Application settings
  "Setting1": "Value1",
  "Setting2": "Value2",

  // Feature Flags
  "feature_management": {
    "feature_flags": [
      {
        "id": "feature1",
        "enabled": true,
        "description": "Simple enabled feature flag"
      }
    ]
  }
}
```

:::info

If you would like to add a prefix to all application settings keys, it is not
advised to wrap all keys in here with a parent object. Instead, you can manage
key prefixes directly in the
[GitHub Actions workflow](./appsettings-deploy.md#using-prefixes-and-labels)
that deploys the settings to AppConfiguration.

:::

### Sentinel Key

When configuring the SDK, it is possible to enable hot-reload of settings. By
default, the SDK polls the AppConfiguration instance every 30 seconds to check
for changes, by downloading the entire configuration. This consumes
[the quota limit](https://azure.microsoft.com/en-us/pricing/details/app-configuration/)
pretty quickly. To avoid this, a `Sentinel` key is used to signal changes in the
configuration. The application only checks for changes in the `Sentinel` key,
and if its value has changed, it downloads the entire configuration again.
Therefore, it is advised to include the `Sentinel` key in the JSON file, even if
it is not used in the application code. The value of the `Sentinel` key can be
any value, as long as it changes whenever any other setting or feature flag is
updated. However, you have to instruct the SDK do monitor the `Sentinel` key for
changes, and optionally configure the refresh interval, as shown below:

```typescript
const appConfig = await load(endpoint, credential, {
  ...
  refreshOptions: {
    // Trigger full configuration refresh only if the `SentinelKey` changes
    enabled: true,
    watchedSettings: [{ key: "Sentinel" }],
    refreshIntervalInMs: 300000, // 5 minutes
  },
});
```

:::info

The blocks `feature_management` and `feature_flags` are mandatory to define
feature flags. If you want to change their names, you need to update the
application code accordingly to let the SDK know about new names.

:::

### Customising Feature Flags

Feature flags can be customised further by adding additional properties, such as
scheduling and target users, or custom filters.

:::info

This page collects some of the most common customisations for feature flags. For
a complete reference, please refer to the
[official documentation](https://learn.microsoft.com/en-us/azure/azure-app-configuration/manage-feature-flags?tabs=switch).
Alternatively, you can create the flag using Azure Portal, and export the JSON
configuration by clicking on `Advanced Edit`.

:::

#### Weighted Random Feature Flags

It is possible to randomly enable a feature flag within a weight, use `seed`:

```json
{
  "feature_management": {
    "feature_flags": [
      {
        "id": "feature-with-seed",
        "enabled": false,
        "description": "Feature flag enabled within a probability of 30%",
        "allocation": {
          "percentile": [
            {
              "variant": "Default",
              "from": 0,
              "to": 100
            }
          ],
          "seed": "30",
          "default_when_enabled": "Default",
          "default_when_disabled": "Default"
        }
      }
    ]
  }
}
```

#### Scheduling Feature Flags

The following snippet shows how to define feature flags with scheduling options,
and eventually recurrence:

```json
{
  "feature_management": {
    "feature_flags": [
      {
        "id": "feature-with-schedule",
        "enabled": false,
        "description": "Feature flag with schedule",
        "allocation": {
          "percentile": [
            {
              "variant": "Default",
              "from": 0,
              "to": 100
            }
          ],
          "conditions": {
            "client_filters": [
              {
                "name": "Microsoft.TimeWindow",
                "parameters": {
                  "Start": "Tue, 11 Nov 2025 23:00:00 GMT",
                  "End": "Wed, 26 Nov 2025 23:00:00 GMT"
                }
              }
            ]
          }
        }
      },
      {
        "id": "feature-with-recurrence",
        "enabled": false,
        "description": "Feature flag with recurrence",
        "allocation": {
          "percentile": [
            {
              "variant": "Default",
              "from": 0,
              "to": 100
            }
          ]
        },
        "conditions": {
          "client_filters": [
            {
              "name": "Microsoft.TimeWindow",
              "parameters": {
                "Start": "Fri, 21 Nov 2025 23:00:00 GMT",
                "End": "Wed, 03 Dec 2025 23:00:00 GMT",
                "Recurrence": {
                  "Pattern": {
                    "Type": "Daily",
                    "Interval": 2
                  },
                  "Range": {
                    "Type": "NoEnd"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

#### Targeting Users with Feature Flags

Feature Flags can be enabled or disabled for specific users or groups by using
the `Microsoft.Targeting` filter. To add a user or group to a feature flag, you
need to add a filter in your code where you specify if a user or group is part
of the ones targeted by the feature flag.

```typescript
const express = require("express");
const server = express();
const port = 8080;

const { AsyncLocalStorage } = require("async_hooks");
const requestAccessor = new AsyncLocalStorage();
// Use a middleware to store request context.
server.use((req, res, next) => {
  // Store the request in AsyncLocalStorage for this request chain.
  requestAccessor.run(req, () => {
    next();
  });
});

// Create a targeting context accessor that retrieves user data from the current request.
const targetingContextAccessor = {
  getTargetingContext: () => {
    // Get the current request from AsyncLocalStorage.
    const request = requestAccessor.getStore();
    if (!request) {
      return undefined;
    }
    const { userId, groups } = request.query;
    return {
      userId: userId,
      groups: groups ? groups.split(",") : [],
    };
  },
};
```

And update the `contextAccessor` accordingly:

```typescript
featureManager = new FeatureManager(
  new ConfigurationMapFeatureFlagProvider(appConfig),
  {
    targetingContextAccessor: targetingContextAccessor,
  },
);
```

Then, the feature flag can be defined as follows:

```json
{
  "feature_management": {
    "feature_flags": [
      {
        "id": "feature1",
        "enabled": true,
        "description": "Enable flag for beta-tests group only",
        "conditions": {
          "requirement_type": "All", // boolean logic for multiple filters
          "client_filters": [
            {
              "name": "Microsoft.Targeting",
              "parameters": {
                "Audience": {
                  "Users": [],
                  "Groups": [
                    {
                      "Name": "beta-testers",
                      "RolloutPercentage": 100
                    }
                  ],
                  "DefaultRolloutPercentage": 0
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

#### Custom logic for Feature Flags

Also custom filters can be created to implement specific logic for enabling or
disabling feature flags. Below is an example of a custom filter that enables a
feature flag based on the user's country:

```typescript
class RandomPercentageFilter {
  name = "Random";

  async evaluate(context, featureFlagValue) {
    const randomNumber = Math.random() * 100;
    const percentage = featureFlagValue?.parameters?.Percentage ?? 0;
    return randomNumber < percentage;
  }
}

const appConfig = await load(endpoint, credential, {
  featureFlagOptions: {
    enabled: true,
    selectors: [
      {
        keyFilter: "*",
      },
    ],
    customFilters: [new RandomPercentageFilter()],
  },
});
```

```json
{
  "feature_management": {
    "feature_flags": [
      {
        "id": "feature-custom",
        "enabled": true,
        "description": "Enable flag with a custom filter",
        "conditions": {
          "client_filters": [
            {
              "name": "Random",
              "parameters": {
                "Percentage": 70
              }
            }
          ]
        }
      }
    ]
  }
}
```

### Variant Feature Flags

A variant feature flag is a feature flag that supports multiple states or
variations. While it can still be toggled on or off, it also allows for
different variants with configurations.

The following example shows two variants using JSON objects for the
configuration value.

Since the topic may be complex and frequently updated, please refer
[to the documentation](https://learn.microsoft.com/en-us/azure/azure-app-configuration/howto-variant-feature-flags).

### Enabling Telemetry for Feature Flags

By connecting AppConfiguration instance to Application Insights, telemetry for
feature flags can be enabled. This allows you to monitor the usage and
performance of feature flags in your application.

To enable telemetry, navigate to Azure Portal and select your AppConfiguration
instance. Under `Telemetry`, select `Application Insights` and choose the
desired Application Insights resource. Save the changes by clicking `Connect`.

Now you can add telemetry per feature flag:

```json
{
  "feature_management": {
    "feature_flags": [
      {
        "id": "ff-with-telemetry",
        "enabled": false,
        "description": "Feature flag with telemetry enabled",
        "telemetry": {
          "enabled": true
        }
      }
    ]
  }
}
```

## Managing multiple environments

If you application is deployed in multiple environments (e.g., Development,
Staging, Production), it is suggested to create separate JSON files for each
non-production environment, e.g., `appsettings.Development.json` and
`appsettings.json`, or `secrets.Development.json` and `secrets.json`. This
allows you to manage environment-specific settings and feature flags easily.

```bash
src/
├── appsettings.json                 # Production (or shared baseline)
├── appsettings.Development.json     # Dev overrides
├── appsettings.Staging.json         # Staging overrides
├── secrets.json                     # Prod secrets (or shared baseline)
└── secrets.Development.json         # Dev secrets
```
