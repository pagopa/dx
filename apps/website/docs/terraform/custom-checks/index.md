---
sidebar_position: 1
---

# Custom Trivy Checks

The DX [static analysis workflow](../static-analysis.md) runs a set of custom
[Trivy](https://trivy.dev/) misconfiguration checks on top of the built-in ones.
These checks encode DX-specific security and best-practice rules for Terraform
code that are not covered by the default Trivy policy set.

The checks are written in
[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) and live in
the
[`.trivy/checks/terraform`](https://github.com/pagopa/dx/tree/main/.trivy/checks/terraform)
folder of the [`pagopa/dx`](https://github.com/pagopa/dx) repository. They are
consumed by passing `--config-check` to `trivy config`.

## How They Run

The DX [Static Analysis - TF Validation](../static-analysis.md) reusable
workflow checks out the DX policies and runs them against your Terraform code:

```bash
trivy config "./" \
  --misconfig-scanners terraform \
  --raw-config-scanners terraform \
  --config-check .trivy/checks/terraform \
  --check-namespaces user \
  --severity MEDIUM,HIGH,CRITICAL
```

Findings are reported in the workflow run summary, and each finding links back
to the documentation page of the check that produced it.

## Available Checks

| ID                              | Severity | Title                                                     |
| ------------------------------- | -------- | --------------------------------------------------------- |
| [AVD-DX-0001](./avd-dx-0001.md) | HIGH     | Terraform must not read Key Vault secrets via data source |
