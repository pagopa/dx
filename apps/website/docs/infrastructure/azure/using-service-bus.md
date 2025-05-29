# Managing Azure Service Bus using Terraform

## Overview

Azure Service Bus is an enterprise service broker with message queues and
publish-subscribe topics. It is used to decouple applications, transferring data
between services using messages.

The monthly cost of `Premium` instances is quite high, so it may be tempting to
create a single instance for all domains that are part of the same product.
Luckily, sharing a single instance among teams is not an issue, as the Service
Bus offers fine granularity in terms of access management (IAM).

This document offers an overview on how to provision a new Namespace, but also
goes deep into explaining the best practices in permission separation and how
and where to write Terraform code. Therefore, the document could be useful for
anybody interested in using Service Bus, even if not shared among domain teams.

## Creating a Service Bus Namespace

The Service Bus Namespace can be provisioned by using the DX Terraform module
[`Azure Service Bus Namespace`](https://registry.terraform.io/modules/pagopa-dx/azure-service-bus-namespace/azurerm/latest),
which hides complexities such as networking, authentication, and scaling.

```hcl
module "service_bus_01" {
  source  = "pagopa-dx/azure-service-bus-namespace/azurerm"
  version = "~>0.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    app_name        = "test"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id = data.azurerm_subnet.pep.id

  tier = "l"

  tags = local.tags
}
```

The module disables access keys, so authentication is handled only by Entra ID.

To manage the infrastructure of the Service Bus Namespace, you must assign the
`Contributor` role to the Principal ID of the team or pipeline (such as a GitHub
Action) responsible for its management.

The recommended approach is to use the
[azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
module. This ensures that the required roles are granted to the repository's
GitHub Actions by including the `sbns_id` variable in the module configuration.

If, for any exceptional reason, you need to configure permissions manually, you
can use the
[`azurerm_role_assignment`](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)
resource to assign the `Contributor` role to a Principal ID. For example:

```hcl
data "azuread_group" "adgroup_domain_devs" {
  display_name = "<your-team>"
}

resource "azurerm_role_assignment" "example" {
  scope                = module.service_bus_01.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.adgroup_domain_devs.object_id
  description          = "This role allows my team to manage entities"
}
```

## Creating Entities and Managing Their Access

Service Bus entities can be created using Terraform resources for
[queues](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_queue),
[topics](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_topic),
and
[subscriptions](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_subscription).

However, the DX Terraform module
[dx-azure-role-assignments](https://registry.terraform.io/modules/pagopa/dx-azure-role-assignments/azurerm/latest)
is helpful to assign roles within those entities, abstracting the complexity of
the role choice. It only requires the Principal ID of the resource that needs to
access the Service Bus; this could be either a Managed Identity associated with
your resource or an Entra ID group.

The following sections show guidance and examples for each entity type.

### Queues

> Queues offer First In, First Out (FIFO) message delivery to one or more
> competing consumers. That is, receivers typically receive and process messages
> in the order in which they were added to the queue. And, only one message
> consumer receives and processes each message.
> [Source](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions#queues)

As consumers compete for the same message, it is recommended to manage queue
access in a single Terraform codebase, so that there is always a clear overview
of which is consuming messages in a given queue. Therefore, the team owner of
the queue should create it and then manage its access in the same configuration,
even if the consumer is in another domain or
[cross-subscription](https://pagopa.github.io/dx/docs/infrastructure/azure/iam-cross-subscription/)
scenario. If multiple teams read events from the same queue without being aware
of them, hard-to-detect concurrency problems could occur.

The following example does:

- Create a queue
- Assign the `Owner` role to an Entra ID team (mandatory if you need to explore
  and modify the queue, e.g., from Azure Portal)
- Assign the `Writer` role to the app which sends events
- Assign the `Reader` role to the app which listens to events

```hcl
resource "azurerm_servicebus_queue" "example" {
  name         = "example-queue"
  namespace_id = module.service_bus_01.id
}

module "queue_team" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <your_team_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "owner"
      description         = "This role allows managing the given queue"
      queue_names         = [azurerm_servicebus_queue.example.name]
    }
  ]
}

module "queue_producer" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <producer_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "writer"
      description         = "This role allows sending messages to the given queue"
      queue_names         = [azurerm_servicebus_queue.example.name]
    }
  ]
}

module "queue_consumer" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <consumer_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "reader"
      description         = "This role allows receiving messages from the given queue"
      queue_names         = [azurerm_servicebus_queue.example.name]
    }
  ]
}
```

### Topics and Subscriptions

> In contrast to queues, topics and subscriptions provide a one-to-many form of
> communication in a publish and subscribe pattern. It's useful for scaling to
> large numbers of recipients. Each published message is made available to each
> subscription registered with the topic. Publishers send a message to a topic,
> and one or more subscribers receive a copy of the message.
> [Source](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions#topics-and-subscriptions)

Since topics replicate messages to each subscriber, the team owner of the entity
will only need to define the topic itself and give the `Writer` role to producer
service in order to post messages.

The following example does:

- Create a topic
- Assign the `Owner` role to an Entra ID team (mandatory if you need to explore
  and modify the topic, e.g., from Azure Portal)
- Assign the `Writer` role to the app which sends events to the topic

```hcl
resource "azurerm_servicebus_topic" "example" {
  name         = "example-topic"
  namespace_id = module.service_bus_01.id
}

module "topic_team" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <your_team_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "owner"
      description         = "This role allows managing the given topic"
      topic_names         = [azurerm_servicebus_topic.example.name]
    }
  ]
}

module "topic_producer" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <producer_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "writer"
      description         = "This role allows sending messages to the given topic"
      topic_names         = [azurerm_servicebus_topic.example.name]
    }
  ]
}
```

Subscriptions' consumers, on the other hand, will be managed by the individual
subscription owners, assigning the `Reader` role to consumers. In cross-domain
scenarios, the Terraform code can be written in the consumer's repository. In
cross-subscription cases, refer to the
[general guidelines](https://pagopa.github.io/dx/docs/infrastructure/azure/iam-cross-subscription).

The following example does:

- Create a subscription
- Assign the `Owner` role to an Entra ID team (mandatory if you need to explore
  and modify the subscription, e.g., from Azure Portal)
- Assign the `Reader` role to the app which receives events

```hcl
# If you are the owner of the topic, you should already have this code:
resource "azurerm_servicebus_topic" "example" {
  name         = "example-topic"
  namespace_id = module.service_bus_01.id
}

# Instead, if you are consuming events of another team's topic use:
data "azurerm_servicebus_topic" "example" {
  name         = "example-topic"
  namespace_id = module.service_bus_01.id
}

resource "azurerm_servicebus_subscription" "example" {
  name               = "example-sub"
  topic_id           = (data.)azurerm_servicebus_topic.example.id
  max_delivery_count = 1
}

module "subscription_team" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <your_team_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "owner"
      description         = "This role allows managing the given subscription"
      subscriptions = {
        example-topic = [azurerm_servicebus_subscription.example.name],
      }
    }
  ]
}

module "subscription_consumer" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>1.0"

  principal_id    = <consumer_principal_id>
  subscription_id = data.azurerm_subscription.current.subscription_id

  service_bus = [
    {
      namespace_name      = module.service_bus_01.name
      resource_group_name = module.service_bus_01.resource_group_name
      role                = "reader"
      description         = "This role allows receiving messages from the given subscription"
      subscriptions = {
        example-topic = [azurerm_servicebus_subscription.example.name],
      }
    }
  ]
}
```
