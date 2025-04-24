---
sidebar_label: Best Practices
sidebar_position: 1
---

# API Management Best Practices

This documentation outlines few best practices for software engineers using
APIM.

The goal is to:

- Enhance security and confidence in API modifications by enabling testing in
  production
- Improve operational simplicity
- Increase developer autonomy

## Leveraging Versioning and Revisions for Safe Testing

APIM provides built-in capabilities for API versioning and revisions, offering a
structured way to manage API changes without disrupting active services.

Thus, leveraging on versioning and revisions is reccommended for:

- Testing in production
  - Modify policies and configurations safely before publishing changes
  - Conduct tests in production without impacting existing API consumers
  - Align versioning with downstream staging services (e.g. AppService and
    Function App staging slots)
- Keeping track of changes:
  - Maintain a clear changelog for tracking revisions
- Introducing breaking changes by maintaining previous API versions

### Versioning

Versioning allows multiple versions of an API Group to coexist. Clients can
request a specific version through:

- Path parameter (e.g. `/api/v1/resource`)
- Header parameter
- Query string parameter

If client does not specify a version, APIM fallbacks to the version chosen as
default.

### Revisions

Revisions enable fine-grained control over API modifications. Each API version
can have multiple revisions with the following states:

- Current: The active revision used for API invocations
- Online: Available for invocation, but only with explicit revision selection
  (e.g. `/api/v1/resource;rev=2`).
- Offline: Inactive but can be promoted to online or current status

### Testing APIs in Production Using Revisions

1. Choose an existing API group
2. Define a new API version
3. Create revisions for incremental modifications (e.g. `rev 2`) and policy
   updates, and set as `Online`
4. Test the revision, by invoking the API under test specifying its revision
   name in URL (e.g. `/api/v1/resource;rev=2`)
5. Finalize changes and promote a revision to current when ready
6. Document modifications using changelogs available through APIM

[VS Code can help you in debugging policies](debugging.md) via its built-in
debugger.

## Managing Subscriptions and Products

Let's illustrate how subscriptions and products function in APIM with an
example.

Imagine you've developed an application exposing REST APIs for weather
forecasts:

- `GET /{city}`: Retrieves the current weather for a specified city.
- `GET /{city}/week`: Retrieves the weekly weather forecast for a specified
  city.

You aim to offer the first API freely, while the weekly forecast requires
payment. Paying users receive an access token upon subscribing, which must be
included as a header in their API requests.

APIM's built-in features facilitate this setup. You would create two products:
one for the free API and another for the paid API. The paid product requires a
subscription as proof of payment. Consequently, you must generate a unique
subscription key for each paying user, managed by the users themselves. These
subscriptions are then linked to the paid product to enforce access control.

Even if you aren't implementing a paywall, the underlying concept remains
applicable. Define logical boundaries for your APIs and group them using
products. These boundaries can be based on business domains, consumer types, or
other relevant criteria. Subsequently, if you are exposing an internal API,
create a subscription for each consumer of your APIs, whether it's a specific
service, another team within your domain, or a team from a different product
area.

### Implementing a Rate Limit Policy

Continuing with the weather forecast example, protecting your APIs from
(unintentional) DDoS attacks is crucial. Since you're using a shared APIM
instance, you need to prevent a single consumer from overwhelming the system.
Therefore, implementing rate limits is essential.

This principle applies even to internally exposed APIs. Leaks or bugs in
upstream services could inadvertently trigger excessive calls, mimicking a DDoS
attack and potentially bringing down the APIM instance.

Consider applying the `rate-limit`
[policy](https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy)
at the product level. It's probable that APIs within the same product share
similar expected invocation rates.
