# blob_rbac_probe

This application exposes a single HTTP endpoint at `/probe` on port `8080` and validates Blob data-plane permissions with `DefaultAzureCredential`.

## HTTP Endpoint

- Path: `/probe`
- Port: `8080`
- Method: `GET`
- Query parameters:
  - `account` (required): Storage account name
  - `container` (required): Blob container name

## Probe Operation

The probe performs three operations against the target container using the managed identity attached to the hosting compute:

- Upload a unique blob
- Download the same blob and verify its content
- Delete the blob

The response always reports the three operation results separately so E2E tests can distinguish between an expected delete denial and an unexpected write or read failure.