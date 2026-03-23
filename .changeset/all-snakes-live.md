---
"azure_container_app": minor
---

Add support for external ingress, custom domains, and managed authentication.

- Add `public_access_enabled` variable (default: `true`, preserving backward compatibility) to toggle public FQDN exposure.
- Add `custom_domain` variable to bind a custom hostname. Supports auto-provisioned Azure-managed TLS certificates (via `dns` block with automatic CNAME and TXT records) or pre-uploaded certificates (via `certificate_id`).
- Add `authentication` variable to enable Azure Managed Authentication (EasyAuth) via Microsoft Entra ID. Unauthenticated browser requests are redirected to the Entra ID login page. The module automatically injects the client secret from Key Vault into the Container App secrets.
- Add input validations on `target_port`, `custom_domain`, and `authentication` to catch misconfiguration early.

Requires `hashicorp/time >= 0.9` and `azure/azapi >= 2.0` providers.
