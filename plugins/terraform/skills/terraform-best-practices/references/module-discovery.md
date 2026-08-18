# Staged Module Discovery

Use this workflow before writing raw provider resources. Search only as deeply as needed to establish module fit and resolve material decisions.

## Stage 1: Find Candidates

Resolve the target provider, service, environment, requested capabilities, and existing module calls from the request and target area.

Search DX module names, READMEs, and `package.json` files for candidates. Cover compute, storage and data services, messaging such as Service Bus and Event Hub, ingress such as CDN and API Management, IAM/RBAC, monitoring, networking, DNS, and private endpoints.

If no candidate exists, record the unsupported capability before considering raw resources.

## Stage 2: Establish the Contract

For each plausible candidate, inspect:

- required and optional variables
- relevant nested object and list fields
- defaults and validation blocks
- supported `use_case` values and their intended environments
- outputs
- current package version

Build a capability map only for the requested behavior and material defaults. Do not inventory every optional variable.

## Stage 3: Verify Behavior

Inspect implementation files when needed to verify:

- resources created by the module
- identity and IAM/RBAC behavior
- networking, private endpoint, and DNS behavior
- secret handling
- diagnostics and operational defaults

Read examples only when the contract or implementation leaves the intended configuration ambiguous.

## Select the Implementation

Use the DX module when it covers the capability. Pin its version using the package version and guardrail `TF-G06`.

Use raw `azurerm_*` or `aws_*` resources only for the unsupported portion. Explain the gap and keep supported capabilities on DX modules instead of replacing the whole module with raw resources.

Apply the [Decision Policy](./question-policy.md) to every unresolved material input.
