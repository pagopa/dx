---
sidebar_label: API Management Best Practices
---

# API Management Best Practices

Azure API Management (APIM) is a cloud-based service that enables organizations
to publish, secure, transform, maintain, and monitor APIs. This documentation
outlines the recommended usage pattern for APIM, focusing on versioning and
revisions.

The goal of this pattern is to:

- Enhance security and confidence in API modifications by enabling testing in a
  production environment before releasing changes.
- Improve operational simplicity by adopting RESTful principles rather than
  custom configurations.
- Increase developer autonomy by standardizing and streamlining API management
  workflows.

## Versioning and Revisions

APIM provides built-in capabilities for versioning and revisions, offering a structured way to manage API changes without disrupting active services.

### Versioning

Versioning in APIM allows multiple versions of an API Group to coexist. Clients can request a specific version through:

- Path parameter (e.g., /api/v1/resource)
- Header parameter
- Query string parameter

#### Benefits

- Safely introduce breaking changes by maintaining previous API versions.

Enable testing of new API versions in production without affecting existing consumers.

Align versioning with Azure AppService and Function App staging slots for seamless testing.
