---
title: "Azure Managed Redis"
ring: adopt
tags: [cloud, azure, persistence]
---

[Azure Managed Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/managed-redis/managed-redis-overview)
is a fully managed in-memory data store built on
[Redis Enterprise](https://redis.io/about/redis-enterprise/), the commercial
distribution of Redis by Redis Inc. It is the evolution of Azure Cache for
Redis, offering higher performance, better reliability, and additional
capabilities such as active geo-replication, Redis modules (RediSearch,
RedisJSON, RedisBloom, RedisTimeSeries), and support for current Redis versions.

## Use cases

Azure Managed Redis is suitable for use cases that require low-latency,
high-throughput data access at scale. Common scenarios include caching
frequently accessed database queries, real-time session storage, job and message
queuing, deduplication with bloom filters, leaderboards via sorted sets, and
analytics acceleration via the Redis ODBC driver.
