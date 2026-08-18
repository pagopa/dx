# Terraform Eval Consumer

This repository is a deterministic fixture for evaluating Terraform changes against an existing Azure environment.

Environment composition lives in `infra/resources/dev`. Shared infrastructure is imported through the DX core values exporter. The DX knowledge base is intentionally not vendored into this repository.
