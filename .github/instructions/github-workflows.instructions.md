---
description: Guidelines for writing reusable GitHub Actions workflows and actions.
applyTo: ".github/workflows/**/*.yaml, .github/workflows/**/*.yml, **/action.yaml, **/action.yml"
---

# Copilot Guidelines for GitHub Workflows and Actions

This document provides guidelines and best practices for creating high-quality, maintainable, and secure reusable GitHub Actions workflows and composite actions within the PagoPA DX repository.

## General Rules

### 1. Configuration: Inputs vs. Environment Variables

Always prefer explicit inputs over implicit environment variables for workflow and action configuration.

- **Explicit is better than Implicit**: Using `on.workflow_call.inputs` or `inputs` in actions defines a clear contract. Callers know exactly what information is required.
- **Predictability**: Environment variables can be accidentally inherited or shadowed. Inputs are scoped and verified by GitHub Actions.
- **Single-run Focus**: Design workflows to be "single-run" where all necessary state is passed in via arguments/inputs, avoiding reliance on pre-existing environment state.

### 2. Version Pinning

Maintain a clear distinction between internal and external dependencies.

- **Internal DX Actions**: It is acceptable to use branch names like `main` or semantic tags for internal PagoPA DX actions during development or when they are part of the same lifecycle as the caller.
- **External Actions**: **MUST** always be pinned to a specific version using a full commit SHA. This protects the pipeline from supply chain attacks and prevents unexpected failures caused by upstream breaking changes.

### 3. Parameter Management

Keep the user interface of your reusable workflows clean and simple.

- **Minimized Count**: Only expose parameters that are strictly necessary.
- **Sensible Defaults**: Provide defaults for optional inputs to simplify the common use cases.
- **Avoid Redundant Inputs**: Do not include inputs that can be inferred from context.

### 4. Logic Isolation

Avoid "YAML hell" by keeping workflow files focused on orchestration rather than implementation.

- **External Scripts**: If a shell script exceeds a few lines or involves complex logic (branching, loops, error handling), isolate it into an external Bash or TypeScript script.
- **Dedicated Actions**: For complex logic requiring dependencies or reuse across multiple workflows, create a dedicated composite action with its own `package.json`. This allows for independent testing and versioning.
- **Maintainability**: Smaller YAML files are easier to audit. Complex logic belongs in languages with better tooling for testing and linting (like TypeScript).

### 5. Concurrency and State Management

- **Concurrency Groups**: Use concurrency groups to prevent parallel runs where sequential execution is needed (e.g., deployments).

### 6. Documentation

- **Hidden Requirements**: Clearly document any hidden requirements or dependencies in pipelines.
- **Input Descriptions**: Provide detailed descriptions for each input parameter to clarify their purpose and usage.
