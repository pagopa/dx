# End-to-End Tests for Azure Cosmos DB Account Module

The goal of this directory is to provide end-to-end tests for the `azure_cosmos_account` Terraform module. These tests ensure that the module works as expected when deployed in a real Azure environment.

The tests are written using [Terratest](https://terratest.gruntwork.io/) in Go and can be executed from the module root with:

```bash
go test -v -timeout 1h ./tests
```

## Scenarios

At the moment, the only scenario covered is the network access configuration of the Cosmos DB account.

### Network Access

This scenario tests the deployment of a Cosmos DB account with private endpoint connectivity. It verifies that the account is correctly configured to use private endpoints and that the necessary DNS settings are in place.

In particular, the infrastructure deploys the module under test (MUT), and two Azure Container Instances both running [Network Access app](./apps/network_access). One of them is deployed within the same virtual network where the private endpoint is created, while the other one is deployed outside that virtual network. The test verifies that the ACI within the VNet can access the Cosmos DB account, while the ACI outside the VNet cannot.
