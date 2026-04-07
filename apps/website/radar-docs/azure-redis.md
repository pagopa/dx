---
title: "Azure Cache for Redis"
ring: hold
tags: [cloud, azure, persistence]
---

[Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
is a fully managed in-memory caching service that provides fast data access with
low latency and high throughput. It is based on the open-source Redis engine and
is designed to improve application performance by offloading database queries
and enabling real-time analytics. The service supports multiple data structures,
automatic scaling, and high availability with geo-replication options.

## Status

Microsoft is transitioning towards
[Azure Managed Redis](./azure-managed-redis.md) as the recommended successor; see
the [Microsoft documentation](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/managed-redis/managed-redis-overview)
for product details. Azure Managed Redis is built on Redis Enterprise, includes
advanced modules (RediSearch, RedisJSON, RedisBloom, RedisTimeSeries), and
offers active geo-replication and better performance characteristics. New
projects should use Azure Managed Redis instead.
