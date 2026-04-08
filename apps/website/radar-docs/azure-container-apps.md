---
title: "Azure Container Apps"
ring: adopt
tags: [cloud, azure, computing, dx]
---

[Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps/)
is a serverless container orchestration and management service provided by
Microsoft Azure. It enables developers to easily deploy and scale containerized
applications, automatically managing underlying resources.

## Why we prefer Container Apps over App Service

- **Event-Driven Scaling**: Scale beyond HTTP — trigger scaling on queue depth,
  custom events, or any KEDA-compatible source, and scale to zero when idle.

- **Internal Microservice Communication**: Services within the same Container
  Apps environment communicate over an internal virtual network with integrated
  DNS, eliminating the need for individual private endpoints per microservice.

- **Canary and Blue/Green Deployments**: Traffic can be split across multiple
  named revisions of the same app, enabling progressive rollouts, A/B testing,
  and instant rollbacks with zero infrastructure changes nor restarts.

## Use cases

Azure Container Apps is ideal for microservice architectures, event-driven
applications, and scenarios requiring rapid scaling based on demand. It is
suitable for applications that need to scale to zero when idle, such as
background processing, APIs, and web applications with variable traffic
patterns.
