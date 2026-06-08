---
azure_cdn: minor
---

Add a built-in geo rate limit rule to the optional Front Door WAF policy. When `waf_enabled` is `true`, traffic originating outside the EU/EEA is blocked once it exceeds the configurable `waf_rate_limit_threshold` (default `10000`) within a 5-minute window, mitigating DDoS-driven cost spikes.
