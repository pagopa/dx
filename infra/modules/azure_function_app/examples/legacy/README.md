# Legacy (Key-based)

This example shows a Function App using legacy **key-based authentication** (classic mode).
Callers must include a function key in the `x-functions-key` HTTP header.
Keys are typically stored in Azure Key Vault and injected by APIM at request time.
