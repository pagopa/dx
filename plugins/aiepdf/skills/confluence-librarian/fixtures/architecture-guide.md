# Architecture Guide — Payment Outcome Notifications

<!-- id: architecture-guide -->

## Overview

This guide describes the target architecture for the payment outcome
notification service. It is the reference for teams that consume or extend the
notification pipeline. The guide is maintained in the platform repository and
published to the architecture documentation space after each review cycle.

## Scope

| ID                         | Item                                         | Value / status                            |
| -------------------------- | -------------------------------------------- | ----------------------------------------- |
| `guide.status`             | Document status                              | draft                                     |
| `guide.owner`              | Owner                                        | Platform Experience                       |
| `guide.version`            | Version                                      | 0.9                                       |
| `guide.languages`          | Supported languages                          | `it-IT`, `en-GB`                          |
| `guide.last-review`        | Last review                                  | 2026-09-01                                |

## Context and goals

The service ingests payment outcome events and produces user-visible
notifications. Notifications must be delivered at most once per logical event,
with a bounded end-to-end latency, and must survive a regional outage of the
underlying message bus.

## Components

| ID                  | Component                 | Responsibility                        | Status   |
| ------------------- | ------------------------- | ------------------------------------- | -------- |
| `comp.ingest`       | Outcome ingest API        | Accept PSP outcome callbacks          | active   |
| `comp.router`       | Notification router       | Map an outcome to the right channel   | active   |
| `comp.queue`        | Delivery queue            | Buffer deliveries between components  | active   |
| `comp.dispatch`     | Dispatcher                | Send notifications through channels   | active   |
| `comp.audit`        | Audit trail               | Record delivery attempts and results  | draft    |

## Key flows

### Outcome ingestion

The PSP calls the ingest API with a signed payload. The service validates the
signature, normalizes the event, and publishes it to the delivery queue.

```
POST /api/v1/outcomes
Accept: application/json
x-psp-signature: <signature>
```

### Delivery retry policy

Delivery attempts are retried with an exponential backoff. The retry budget is
bounded and the policy is encoded in the `delivery-policy` configuration, never
in application code.

| ID               | Parameter          | Default     | Status |
| ---------------- | ------------------ | ----------- | ------ |
| `retry.attempts` | Max attempts       | 5           | active |
| `retry.backoff`  | Backoff (seconds)  | 30          | active |
| `retry.timeout`  | Timeout (seconds)  | 300         | active |

## Naming and reference conventions

Stable identifiers are reused across this guide, the OpenAPI contract, and the
monitoring dashboards. Do not rename them without a deprecation cycle.

| Identifier      | Meaning                       | Owner             |
| --------------- | ----------------------------- | ----------------- |
| `svc.outcomes`  | Outcome service name          | Platform          |
| `metric.outcome.delivery.latency` | End-to-end delivery latency | Platform |
| `evt.outcome.delivered` | Event emitted after delivery | Platform   |

## Related links

- [OpenAPI contract](https://github.com/pagopa/dx/blob/main/openapi/outcomes.yaml)
- [Delivery dashboard](https://pagopa.grafana.net/d/outcome-delivery)
- [Outcome API reference](https://docs.pagopa.it/outcome-api)
