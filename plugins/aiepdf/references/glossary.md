# AIEPFD glossary

Shared domain glossary for skills in the `aiepfd` plugin. Read this file before
interpreting or producing plugin artifacts so terms are used consistently across
skills.

This glossary mirrors the terminology in the Confluence page _Glossary of the
AI-enabled framework_ and is intentionally kept in the same language.

## Acronyms

| Acronym | Meaning | Framework definition |
| --- | --- | --- |
| **AC** | Acceptance Criteria | Verifiable criteria describing the expected behavior, used to validate Stories, Tasks, and tests. |
| **ADR** | Architecture Decision Record | A _code-adjacent_ repository document that records local implementation decisions made by Engineering or coding agents. |
| **AI** | Artificial Intelligence | An enabling component of the framework: agents, Skills, automations, and assisted validations. |
| **API** | Application Programming Interface | A technical interface between systems; within the framework it must be tracked and preferably described by a machine-readable contract. |
| **CI** | Continuous Integration | Automatic execution of deterministic checks on builds, tests, contracts, and regressions. |
| **CI/CD** | Continuous Integration / Continuous Delivery | An integration and release pipeline that makes agentic delivery verifiable and repeatable. |
| **CR** | Change Request | A governance unit for material changes: it tracks impact, required reviewers, and propagation to downstream artifacts. |
| **DAG** | Directed Acyclic Graph | An orchestration model for Skills, with explicit prerequisites and steps executable in deterministic order. |
| **DevEx** | Developer Experience | The function owning the toolchain for the agentic delivery phase. |
| **DLQ** | Dead Letter Queue | A queue or recovery area for unprocessed events, useful for diagnosing, replaying, and making the toolchain resilient. |
| **DM** | Data Masking | A set of rules that minimize and filter data before cross-tool writes, especially for sensitive content. |
| **DoD** | Definition of Done | An operational or technical completion checklist incorporated into the description of Stories and Tasks. |
| **DoR** | Definition of Ready | A deterministic gate that verifies whether a Story or Task is complete enough to be taken into execution. |
| **DPIA** | Data Protection Impact Assessment | A privacy document to link to the contract when the use case handles personal data or material impacts. |
| **DR** | Design Review | A thematic document describing the framework's current approvable state and consolidating high-level decisions. |
| **DR (SRS)** | Design Review (synonym for _Software Requirements Specification_) | A living document that unifies review and requirements, serving as the operational source of truth for backlog and implementation. |
| **E2E** | End-to-End | A test or gate validating a complete flow from input to final outcome. |
| **EPIC** | Epic | A measurable and releasable business-value initiative or capability. |
| **HITL** | Human-in-the-Loop | Mandatory human approval or review before an AI-generated output can enter execution. |
| **IAM** | Identity and Access Management | A model of identity, least-privilege permissions, and dedicated service accounts for agents and Skills. |
| **IaC** | Infrastructure as Code | Management of infrastructure as versioned, verifiable code that can be released through a pipeline. |
| **JTBD** | Jobs To Be Done | A model describing the user's need in terms of outcomes; within the framework it connects PRDs, Use Cases, backlog, and KPIs. |
| **JSM** | Jira Service Management | An operational channel for support and incidents, also used in the incident-to-requirement bridge. |
| **KB** | Knowledge Base | A support knowledge base: FAQs, operator guides, manuals, and links needed before go-live. |
| **KPI** | Key Performance Indicator | A success metric used to measure outcomes, adoption, rollout, quality, and framework effectiveness. |
| **MCP** | Model Context Protocol | A protocol for tool-native access to external systems such as Confluence, Jira, Figma, or data catalogs. |
| **MSA** | Minor Scope Adjustment | A small scope adjustment allowed only when it does not change expected behavior or require a new Story or CR. |
| **OpenAPI** | OpenAPI Specification | A machine-readable technical contract for HTTP APIs, used for generation, validation, and breaking-change detection. |
| **PII** | Personally Identifiable Information | Personal data that must be detected, filtered, or masked before being written to shared tools. |
| **PM** | Project / Product Manager | A role governing priorities, backlog, HITL reviews, and operational progress decisions. |
| **PMO** | Project Management Office | The function monitoring rollout, milestones, KPIs, and framework adoption status. |
| **PR** | Pull Request | A code review unit linked to evidence, tests, change impact, and updates to technical contracts. |
| **PRD** | Product Requirements Document | An outcome-oriented product requirements document covering JTBD, metrics, constraints, and scope. |
| **QA** | Quality Assurance | The function connecting acceptance criteria, Gherkin, test plans, coverage, and quality validation. |
| **RFC** | Request for Comments | A decision discussion document collecting options and trade-offs, becoming operational only after incorporation into the parent DR. |
| **SLI** | Service Level Indicator | An observable indicator used to measure the health, quality, or reliability of a service. |
| **SLO** | Service Level Objective | A target objective associated with a service, process, or initiative. |
| **SRE** | Site Reliability Engineering | The function observing runtime, incidents, rollbacks, alerting, and post-release feedback. |
| **UC** | Use Case | A Use Case with a stable ID, trigger, prerequisites, flows, edge cases, and acceptance checks. It structurally describes **the entire interaction** between a user (actor) and system components to achieve a goal. |
| **UX** | User Experience | A design dimension covering flows, accessibility, Figma components, and interaction quality. |

## Key concepts and capabilities

| Term | Definition |
| --- | --- |
| **Structured contract** | The minimum set of verifiable information describing a deliverable and enabling downstream automations, regardless of its original format. |
| **Tool-native authoring** | The principle that each function works in its natural tool (Confluence, Jira, Figma, GitHub, data catalog) without having to write artificial technical formats. |
| **Emergent / derived metadata** | Metadata calculated by agents or scripts, such as coverage, drift, or breaking changes, rather than entered manually. |
| **Shadow pre-fill metadata** | Automatic pre-filling of Jira metadata in draft state, with human confirmation before activation. |
| **Closed feedback loop** | A cycle in which the agent generates, validates, corrects, and produces evidence before human handoff. |
| **Platform Standards** | A technical baseline defining how an agent must operate on workspaces, repositories, technical contracts, CI, and environments. |
| **Greenfield spec-first / contract-first** | A mode for new initiatives: the approved contract precedes code and guides generation, implementation, and validation. |
| **Brownfield infer-and-ratify** | A mode for existing systems: contracts and ADRs are inferred from code, infrastructure, and runtime, then reviewed and ratified. |
| **Support Readiness / Operations Contract** | The minimum set of KBs, runbooks, error catalogs, operational capabilities, and data access required before go-live for assistance (_operations_) capabilities. |
| **Change Request flow** | A flow governing material changes to requirements, APIs, data, design, or compliance through triage, approval, and propagation. |
| **Propagation matrix** | A map of artifacts that must be updated when a source of truth changes, to prevent cross-tool drift. |
| **Artifact change detection** | Automatic or assisted detection of material changes requiring a CR or downstream updates. |
| **Skill taxonomy** | Classification of Skills as consultative, generative, or blocking, with explicit prerequisites and responsibilities. |
| **Plugin / Skill registry** | A lightweight catalog of Skills, plugins, prompts, workflows, and MCP tools with owner, version, inputs, outputs, and risks. |
| **Metadata-only extraction** | A minimization rule under which only status and metadata, not full text, are extracted from sensitive sources. |
| **Least privilege** | The principle that each agent or service account receives only the permissions strictly required for its domain. |

## Roles and responsibilities in the framework

| Role / function | Main responsibility |
| --- | --- |
| **Product** | Owns the PRD and governs JTBD, outcomes, and product contract content. |
| **PM** | Governs priorities, sprints, HITL reviews, and operational approval of the AI-generated backlog. |
| **Platform** | Defines the toolchain, automations, Skills, registry, audit, fallback, and observability of the agentic platform implementing the AI-enabled Framework. |
| **DevEx** | Defines and implements the technical standards, integrations, and baseline required for the delivery phase ("Delivery Standards"). |
| **Engineering** | Implements code, technical contracts, and tests according to the AI Framework and Delivery Standards; produces or validates ADRs. |
| **Design / UX** | Produces Figma flows, components, accessibility annotations, and mappings between Stories and interfaces. |
| **Security / Privacy** | Validates trust boundaries, security reviews, DPIAs, masking, PII filters, and re-reviews for material changes. |
| **Data / Analytics** | Manages aggregate metrics, tracking, data contracts, and data ingestion. |
| **QA** | Translates ACs into tests, maintains coverage, and verifies consistency between expected and implemented behavior. |
| **Assistance / Ops** | Validates support readiness, KBs, runbooks, error catalogs, and the operational supportability of released capabilities. |
| **SRE** | Monitors runtime, alerting, incidents, rollbacks, and post-release operational signals. |
| **PMO** | Monitors adoption status, milestones, rollout, and framework KPIs at organizational level. |

## Quick distinction: Platform vs Engineering

| Function | Focus |
| --- | --- |
| **Platform** | Defines and approves **how** an agent can work securely, consistently, and in a governable way. |
| **Engineering** | Executes **what** must be implemented in the product, using the contracts and standards defined upstream. |

## Usage note

This glossary is intended to be a living document: when an RFC is accepted
and incorporated into the parent DR, the definitions here should also be
updated.
