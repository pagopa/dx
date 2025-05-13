# Managing Azure Service Bus Across Domains using Terraform

Managing Access Management (IAM) across multiple domains of the same product can
be tough. This guide provides a strategy to define resources and role
assignments using Terraform, ensuring a clear separation of concerns and
resource ownership.

## Overview

To grant permissions for a resource to send or receive events from Azure Service
Bus, you need to create a `Role Assignment` resource that assigns specific roles
to the target subscription/queue. However, managing this code across separate
Git repositories for each product domain could be challenging.

## Creating a Service Bus Namespace

The Service Bus Namespace could be provisioned by using the new DX Terraform
module
[`Azure Service Bus Namespace`](https://registry.terraform.io/modules/pagopa-dx/azure-service-bus-namespace/azurerm/latest),
which hides complexity such as networking, authentication and scaling.

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

The module disables access via access keys, meaning that authentication is
managed via Entra ID only.

## Managing Service Bus IAM Step-by-Step

### Requirements

To implement a cross-domain role assignment, you will need the Principal ID of
the resource that needs to access the Service Bus; this could be either a
Managed Identity associated with your resource or an Entra ID group.

### Creating Entities and Managing their Access

Service Bus entities (queues, topics and subscriptions) can be created by using
Terraform resources. However, you can use the DX Terraform module
[dx-azure-role-assignments](https://registry.terraform.io/modules/pagopa/dx-azure-role-assignments/azurerm/latest)
to create roles within the entities. The module allows you to give more roles at
a time to the same principal and abstracts away the complexity of the role
choice.

The following sections shows guidance and examples for each entity type.

#### Queues

The team who owns the Queue should create it and then managing its access. The
reason lies in the nature of queues. All consumers of the queue compete for the
same message; multiple teams could therefore decide to read events from the same
queue on their own, giving rise to concurrency problems that are difficult to
detect.

The following example does:

- create a queue
- assign the `Owner` role to a Entra ID team (mandatory if you need to explore
  and modify the queue e.g. from Azure Portal)
- assign the `Writer` role to the app which sends events
- assign the `Reader` role to the app which listen to events

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
      description         = "This role allows to manage the given queue"
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
      description         = "This role allows to send message to the given queue"
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
      description         = "This role allows to receive message to the given queue"
      queue_names         = [azurerm_servicebus_queue.example.name]
    }
  ]
}
```

#### Topics

The team who owns the Topic should create it and then managing its access for
their own resources only.

The following example does:

- create a topic
- assign the `Owner` role to a Entra ID team (mandatory if you need to explore
  and modify the topic e.g. from Azure Portal)
- assign the `Writer` role to the app which sends events

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
      description         = "This role allows to manage the given topic"
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
      description         = "This role allows to send message to the given topic"
      queue_names         = [azurerm_servicebus_topic.example.name]
    }
  ]
}
```

#### Subscriptions

The team who owns the Subscription should create it and then managing its access
for it. Subscriptions should not be shared among services. each subscription is
an entity in itself, with business logics strongly linked to the event consumer.
The production team has no need to know the consumers, the message is sent in
broadcast

The following example does:

- create a topic
- create a subscription
- assign the `Owner` role to a Entra ID team (mandatory if you need to explore
  and modify the subscription e.g. from Azure Portal)
- assign the `Reader` role to the app which receive events

```hcl
# if you are owner of the topic:
resource "azurerm_servicebus_topic" "example" {
  name         = "example-topic"
  namespace_id = module.service_bus_01.id
}

# if you are consuming events of a another team's topic:
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
      description         = "This role allows to manage the given subscription"
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
      description         = "This role allows to receive messages from the given subscription"
      subscriptions = {
        example-topic = [azurerm_servicebus_subscription.example.name],
      }
    }
  ]
}
```
