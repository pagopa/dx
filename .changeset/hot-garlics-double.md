---
"azure_api_management": patch
---

Add `resource_id` attribute when creating the APIM logger

## NOTE
It is possible to use this module's version even if you omit the `id` parameter within the `application_insights` block.

If you add the `id`, this will force the recreation of the Logger resource. If you have some reference to the Logger instance, you should use the `logger_id` output provided by the module.
