---
"azure_container_app": patch
---

A couple of fixes:

- Replace some unsupported characters from secret names
- Auto generate the container name if not provided. Previous version used the image name as container name, but it contains invalid characters.
