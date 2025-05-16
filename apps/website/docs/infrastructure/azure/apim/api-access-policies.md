---
sidebar_label: Manage API Access and Policies
sidebar_position: 1
---

# Manage API Access and Policies

This documentation outlines a few best practices for software engineers using
APIM.

The goal is to:

- Improve operational simplicity
- Increase domain separation and autonomy
- Improve security

## Introducing Breaking Changes via Versioning

Versioning allows multiple versions of an API Group to coexist. Clients can
request a specific version through:

- Path parameter (e.g. `/api/v1/resource`)
- Header parameter
- Query string parameter

If the client does not specify a version, APIM falls back to the version chosen
as default.

Therefore, it is compelling to leverage versioning to introduce breaking changes
in the REST APIs contracts, giving clients the appropriate time to migrate.

Although it is not mandatory, we suggest specifying the version in the request
path.

## Managing Subscriptions and Products

APIM **subscriptions** secure API access, while **products** group APIs with
policies for specific audiences, used to manage access, quotas, and tailored API
offerings.

Let's illustrate how to leverage these concepts with an example.

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
subscription key for each paying user. These keys are managed by the users
themselves. These subscriptions are then linked to the paid product to enforce
access control.

Even if you aren't implementing a paywall, the underlying concept remains
applicable. Define logical boundaries for your APIs and group them using
products. These boundaries can be based on business domains, consumer types, or
other relevant criteria. Subsequently, if you are exposing an internal API,
create a subscription for each consumer of your APIs, whether it's a specific
service, another team within your domain, or a team from a different product
area.

[Official documentation](https://learn.microsoft.com/en-us/azure/api-management/api-management-subscriptions)
provides deep knowledge in how APIM handles requests with or without
subscription keys.

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
