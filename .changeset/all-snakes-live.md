---
"azure_container_app": minor
---

Add support for external ingress, custom domains, and managed authentication.

- Add `external_enabled` variable (default: `false`) to expose the Container App via a public FQDN.
- Add `custom_domain` variable to bind a custom hostname with an Azure-managed TLS certificate. When `dns` is provided, CNAME and TXT validation records are created automatically in the specified Azure DNS zone.
- Add `auth` variable to enable Azure Managed Authentication (EasyAuth) via Microsoft Entra ID. Unauthenticated browser requests are redirected to the Entra ID login page. The module automatically injects the client secret from Key Vault into the Container App secrets.
- Add input validations on `target_port`, `custom_domain`, and `auth` to catch misconfiguration early.

Requires `hashicorp/time >= 0.9` and `azure/azapi >= 2.0` providers.
