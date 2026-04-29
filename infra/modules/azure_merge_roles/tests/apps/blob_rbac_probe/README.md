# blob_rbac_probe

This application exposes HTTP endpoints on port `8080` to validate both Blob data-plane permissions and Storage control-plane permissions with `DefaultAzureCredential`.

## HTTP Endpoint

- Path: `/probe`
- Port: `8080`
- Method: `GET`
- Query parameters:
  - `account` (required): Storage account name
  - `container` (required): Blob container name

- Path: `/management-probe`
- Port: `8080`
- Method: `GET`
- Query parameters:
  - `account_id` (required): ARM resource ID of the target storage account

## Probe Operation

The probe performs three operations against the target container using the managed identity attached to the hosting compute:

- Upload a unique blob
- Download the same blob and verify its content
- Delete the blob

The response always reports the three operation results separately so E2E tests can distinguish between an expected delete denial and an unexpected write or read failure.

The management probe performs the analogous create, read, and delete flow through the Azure control plane for blob container resources. This lets the E2E suite verify `actions` and `not_actions` behavior separately from Blob `data_actions`.
