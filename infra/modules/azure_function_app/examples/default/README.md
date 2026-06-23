# Entra ID - Managed Identity (Recommended)

This recommended example shows a Function App using **Entra ID (Azure AD) authentication** via Managed Identity.

Instead of function keys, callers (e.g. APIM) use their Managed Identity to obtain a signed JWT
from the configured Entra ID application, then present it in the `Authorization: Bearer` header.
The Function App validates the token and rejects unauthenticated or unauthorized requests with HTTP 401.

Function endpoints should use `authLevel: anonymous` since authentication is enforced at the
infrastructure level by the Function App auth middleware.

## Prerequisites

- An Entra ID application registration must exist to act as the token audience.
- The APIM instance (or other caller) must have a Managed Identity.
- The APIM policy must be configured to acquire a token for the audience application:
  ```xml
  <authentication-managed-identity resource="<audience_client_id>"/>
  ```
