# AWS GitHub Environment Bootstrap Tests

Run the offline tests from the repository root:

```sh
pnpm nx run aws_github_environment_bootstrap:test
```

AWS and GitHub are mocked, the CodeBuild runner module is overridden, and the DX
provider's naming functions run locally. No infrastructure is created.

`unit.tftest.hcl` covers automatic repository secret creation and the role output,
DX naming, exact token-only IAM permissions, unchanged deployment secrets, and
repository-scoped OIDC trust for both legacy and immutable subjects. It checks
PR, branch and cross-environment contexts and rejects other repository subjects.
The exact policy assertion rejects additional actions and service-name conditions
on `sts:GetServiceBearerToken`; the token Allow must not require injected context.
The IAM policy document data source is mocked; trust assertions inspect its
configured statements, while permission assertions inspect the role's JSON policy.
This does not replace a live GitHub OIDC/ECR login check or prove fork filtering
for workflows running in the base repository context.

`contract.tftest.hcl` covers production defaults and the secret's ignored value
changes. One run applies **only fully mocked AWS/GitHub resources** to seed local
test state; a following plan changes the desired role ARN and verifies that the
secret retains its original value. This stateful test is necessary to exercise
Terraform's `ignore_changes`, rather than merely inspect its declaration.
It does not model concurrent creation or destruction across independent states;
those operations still require coordination.

Live AWS login checks are not run by this suite. They require organization approval
for the ECR Public authorization endpoint in `us-east-1`, GitHub OIDC, and the
repository secret forwarded to the reusable validation workflow.
