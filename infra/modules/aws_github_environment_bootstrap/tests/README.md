# AWS GitHub Environment Bootstrap Tests

Run the offline plan-only tests from the repository root:

```sh
pnpm nx run aws_github_environment_bootstrap:test
```

AWS and GitHub are mocked, the CodeBuild runner module is overridden, and the DX
provider's naming functions run locally. No infrastructure is created.

`unit.tftest.hcl` covers the disabled default, opt-in repository secret and output,
DX naming, exact token-only IAM permissions, unchanged deployment secrets, and
repository-scoped OIDC trust for both legacy and immutable subjects. It checks
PR, branch and cross-environment contexts and rejects other repository subjects.
The IAM policy document data source is mocked; trust assertions inspect its
configured statements, while permission assertions inspect the role's JSON policy.
This does not replace a live GitHub OIDC/ECR login check or prove fork filtering
for workflows running in the base repository context.

`contract.tftest.hcl` covers explicit non-owner environments and null input
falling back to the disabled default. Single ownership across independent states
is an operator responsibility; the module cannot discover competing states.

Live AWS login checks are not run by this suite. They require organization approval
for the ECR Public authorization endpoint in `us-east-1`, GitHub OIDC, and the
repository secret forwarded to the reusable validation workflow.
