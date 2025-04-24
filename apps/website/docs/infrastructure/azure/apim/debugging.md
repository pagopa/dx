---
sidebar_label: Debugging APIM Policies
sidebar_position: 2
---

# Debugging APIM Policies

Visual Studio Code can connect to an online APIM instance, and provide debugging
capabilities to developers. For example, it is possible to debug a policy by
using breakpoints, from the local environment. In fact, VS Code can:

- Debug policies with built-in breakpoint support
- Create API Groups using OpenAPI definitions
- Associate APIs with products
- Switch between revisions
- Execute API tests

## Using VS Code to Debug APIs

This section shows a guide through VS Code policy-debugging capabilities.

1. Install the `API Management`
   [extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-apimanagement)
2. (Optional) Install the `REST Client`
   [extension for VS Code](https://marketplace.visualstudio.com/items?itemName=humao.rest-client):
   it automatically manage the subscription key in request header
   (`Ocp-Apim-Debug`)
3. Run the `API Management` extension and select the APIM instance
4. Navigate through the desired API group and operation to debug
5. Right click and select `Start Policy Debugging`
6. Set a breakpoint in policy body
7. Invoke the API under test

![APIM Policy in Debug Mode](./apim-usage-patterns/apim-debugging.png)
