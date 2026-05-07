# delegated-access-sas

This example provisions an Azure Storage Account through the local module source using the `delegated_access` use case.

It creates:

- one private blob container used for SAS-based upload and download checks
- one user-assigned managed identity that can request user delegation keys and write blobs in that container
- equivalent role assignments for the current Terraform caller so the local Go verification script can run with `DefaultAzureCredential`

After `terraform apply`, run the verification script from the module root:

```bash
pnpm run verify:delegated-access -- \
  --account-name <storage-account-name> \
  --container-name <container-name>
```

That command delegates to `tests/cmd/verify-user-delegation-sas`, which generates a User Delegation SAS via the Azure Go SDK and then uploads/downloads a blob using only the signed URL.

To force the script to use the example user-assigned identity from inside an Azure workload, set `AZURE_CLIENT_ID` to the `managed_identity_client_id` output before running it.