---
"provider-azure": patch
---

Enhance redundancy validation for resource names and abbreviations, a bare prefix match like domain="fdo" against abbreviation="fdog" must not trigger this check.
