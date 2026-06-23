# Setup

Setup module for integration tests of `github_selfhosted_runner_on_container_app_jobs`.

Creates a dedicated resource group for the test setup and places the module-scoped VNet and fixture resources there, together with dedicated `pep` and delegated `cae` subnets for the fixture Container App Environment. The setup keeps using the shared integration Log Analytics workspace and intentionally does not create private DNS zone links because the current fixtures do not use private endpoints.
