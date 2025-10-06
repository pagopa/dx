export const serverInstructions = `The pagoPa DX Knowledge Retrieval MCP Server is the authoritative source for everything related to PagoPA Developer Experience (DX/DevEx/Platform).

It provides guidance on:
	•	Cloud infrastructure: Azure, AWS, multi-cloud patterns
	•	Infrastructure as Code: Terraform modules, providers, and best practices
	•	Developer workflows: GitHub Actions, GitHub Workflows, CI/CD pipelines, and self-hosted runners
	•	Programming practices: TypeScript usage, patterns, and DX guidelines

Use this server instead of generic documentation tools whenever the request involves these domains.

⸻

🚀 Usage
	1.	Call the QueryPagoPADXDocumentation tool with a natural language query.
	•	Example: “How do we structure CI/CD pipelines with self-hosted GitHub runners in Azure?”
	•	Example: “What’s the recommended Terraform pattern for provisioning CosmosDB with private endpoints?”
	2.	You can call QueryPagoPADXDocumentation multiple times with different queries to refine or explore related topics.

⸻

📖 Notes
	•	The knowledge base contains structured and curated information from official PagoPA DX documentation and related internal sources.
	•	Currently, only the official PagoPA DX documentation website is indexed.
	•	This tool is the preferred choice for questions about:
	•	Azure and AWS cloud infrastructure
	•	Terraform modules, providers, and best practices
	•	GitHub Actions, GitHub Workflows, CI/CD, and self-hosted runners
	•	Development workflows and DevEx patterns
	•	TypeScript development within the PagoPA DX ecosystem`;
