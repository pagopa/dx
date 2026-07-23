# PRD - AI-Enabled Product Development Framework

<!-- id: metadata -->

## Metadata

| ID                          | Value |
| --------------------------- | ----- |
| `metadata.status`           | draft |
| `metadata.sponsor`          | Not confirmed - the source identifies the Director of Engineering as the quoted spokesperson, not as the sponsor |
| `metadata.owner`            | Not confirmed - Product owner is not identified in the source |
| `metadata.budget`           | Not confirmed - the source mentions an AI-credit budget but does not identify an approved funding source |
| `metadata.legal-compliance` | Requested - security, privacy, and compliance are stated as required framework concerns; formal consultation status is not stated |
| `metadata.engineering`      | Requested - remote cloud agents and integrations are described as prerequisites; formal engineering assessment is not stated |
| `metadata.target-release`   | Not confirmed - the source proposes a 4-6 month pilot and a 12-month adoption horizon, but no release date |
| `metadata.priority`         | Not confirmed - the source establishes strategic importance but does not assign a delivery priority |

<!-- id: need -->

## Need definition

PagoPA teams already use AI and tools such as Figma, GitHub Copilot, Jira, and
Confluence, but the current product-development handoffs are described as
fragmented and dependent on free-form interpretation. Requirements can be
translated differently by Product, Design, Engineering, and QA, causing
clarification rounds, blocked work, avoidable defects, and late discovery of
security, privacy, accessibility, usability, compliance, and operational gaps.

The opportunity is to establish a common, AI-enabled operating standard across
the product lifecycle without replacing the tools teams already use. The
standard should connect each phase through structured contracts and a
phase-specific Definition of Done, so that outputs are understandable to both
people and downstream AI assistants. The source PR-FAQ describes this as a
framework-level intervention rather than a new standalone product.

Source: [PR-FAQ: AI-Enabled Product Development Framework](https://pagopa.atlassian.net/wiki/spaces/APDF/pages/3039985794/PR-FAQ+AI-Enabled+Product+Development+Framework).

<!-- id: actors -->

## Actors

| ID                | Persona or actor | Definition of behavior and needs |
| ----------------- | ---------------- | -------------------------------- |
| `actors.item-001` | Product Manager | Defines the product need and requirements, resolves potential edge cases and constraints, and needs more time for product reasoning instead of repeated clarification work. |
| `actors.item-002` | Designer | Receives structured requirements, uses the Design System and design tools to create or refine user flows, and needs fewer ambiguous handoffs with Product and Engineering. |
| `actors.item-003` | Engineer | Receives structured work through Jira, implements and reviews AI-assisted code and tests, and needs requirements that are clear enough to reduce setup time and technical questions. |
| `actors.item-004` | QA practitioner | Reviews test cases generated from the same requirements used by the delivery team and needs better coverage with less repetitive manual test authoring. |
| `actors.item-005` | SRE or Operations practitioner | Monitors released services and manages operational recovery, with a stated future need for agent-assisted monitoring and restoration workflows. |
| `actors.item-006` | External partner, supplier, or institutional stakeholder | Provides or consumes product requirements and may benefit from more predictable interpretation, integration, and review of PagoPA initiatives. |
| `actors.item-007` | AI agent | Consumes and produces structured contracts within controlled boundaries, supporting requirements, design, development, QA, documentation, and operational activities. |

<!-- id: objectives -->

## Objectives

<!-- id: objectives.user-goals -->

### User goals

For user-facing initiatives, express each goal as a JTBD:
“When [situation], I want [objective], so I can [expected outcome].”

| ID                         | Persona | Job statement | Expected outcome | Success metric | Quality guardrail | Priority | Notes |
| -------------------------- | ------- | ------------- | ---------------- | -------------- | ----------------- | -------- | ----- |
| `objectives.jtbd.item-001` | Product Manager | When I initiate a product change, I want to express the need, requirements, edge cases, success metrics, and applicable constraints in a structured contract, so I can align downstream contributors with fewer clarification rounds. | A shared, complete starting point for Design, Engineering, QA, and Operations. | Contribution to the target 30% reduction in end-to-end lead time; alignment-round baseline and target to be defined during the pilot. | Applicable security, privacy, accessibility, usability, compliance, and operational considerations are identified before delivery. | Must | The PR-FAQ example describes one final review instead of 4-5 clarification rounds. |
| `objectives.jtbd.item-002` | Designer | When I receive a structured product requirement, I want machine-readable design inputs and Design System references, so I can create and refine flows without reinterpreting the requirement. | Faster and more consistent Product-to-Design handoff with design decisions traceable to the source contract. | Design-handoff clarification rounds and time-to-first-flow; baseline and target to be defined during the pilot. | Output respects the company Design System and preserves usability and accessibility requirements. | Must | The source describes generation of a first flow followed by Designer refinement in Figma. |
| `objectives.jtbd.item-003` | Engineer | When a Jira task is ready for implementation, I want a structured contract that an AI coding agent can consume, so I can spend more effort reviewing and improving the solution than resolving ambiguous requirements. | Reduced implementation setup effort and fewer defects caused by requirement misinterpretation. | Contribution to the target 50% reduction in bugs caused by requirement misinterpretation and the target 30% reduction in end-to-end lead time. | Human engineers review and approve AI-generated changes; engineering standards and required tests remain applicable. | Must | The source describes GitHub Copilot being activated from Jira and engineers reviewing the resulting pull request. |
| `objectives.jtbd.item-004` | QA practitioner | When requirements are ready for validation, I want test cases generated from the same source contract, so I can focus on coverage, risk, and user empathy instead of repetitive test writing. | More consistent validation coverage with less duplicated interpretation of requirements. | Manual test-authoring effort and requirement-related escaped defects; baseline and target to be defined during the pilot. | Security and privacy validation remain part of the test scope where applicable. | Must | The source states that QA receives test cases from the single source of truth. |
| `objectives.jtbd.item-005` | SRE or Operations practitioner | When a feature is released, I want operational expectations and monitoring signals to be traceable to the delivery contract, so I can detect and recover from service anomalies with less manual coordination. | Better operational completeness and a more reliable transition from release to service operation. | Reduction of identified Operations gaps toward the stated 100% completeness target; measurement definition to be confirmed. | Recovery automation must operate within approved security, privacy, and operational controls. | Should | Agent-led monitoring and automatic restoration are described as the target operating vision, not as an approved implementation. |

<!-- id: objectives.business-goals -->

### Business goals

| ID                             | Business objective | Success metric | Priority | Notes |
| ------------------------------ | ------------------ | -------------- | -------- | ----- |
| `objectives.business.item-001` | Establish a common operating standard for AI-enabled product development across the product lifecycle. | 100% of teams aligned to the new guidelines within 12 months. | Must | The source proposes a 4-6 month pilot before full rollout. |
| `objectives.business.item-002` | Accelerate delivery of digital products and services without reducing completeness. | 30% reduction in end-to-end lead time. | Must | Target is provisional until validated and adjusted during the pilot. |
| `objectives.business.item-003` | Reduce delivery defects caused by ambiguous or differently interpreted requirements. | 50% reduction in bugs caused by requirement misinterpretation. | Must | Baseline, defect taxonomy, and measurement source are not specified. |
| `objectives.business.item-004` | Prevent structural gaps in security, privacy, and operations from reaching release. | 100% reduction in identified gaps in Security, Privacy, and Operations. | Must | The source states this as a completeness target; the operational definition of a gap is open. |

<!-- id: metrics -->

## Success metrics

<!-- id: metrics.outcome-kpis -->

### Outcome KPIs

| ID                     | KPI | Baseline | Target | Source | Review date |
| ---------------------- | --- | -------- | ------ | ------ | ----------- |
| `metrics.kpi.item-001` | End-to-end product lead time | Not provided | -30% | Delivery lifecycle measurement to be defined | After the 4-6 month pilot |
| `metrics.kpi.item-002` | Bugs caused by requirement misinterpretation | Not provided | -50% | Defect tracking and root-cause classification to be defined | After the 4-6 month pilot |
| `metrics.kpi.item-003` | Identified Security, Privacy, and Operations completeness gaps | Not provided | -100% | Release-readiness and compliance evidence to be defined | After the 4-6 month pilot |
| `metrics.kpi.item-004` | Team adoption of the new guidelines | Not provided | 100% within 12 months | Adoption telemetry or periodic assessment to be defined | At 12 months |
| `metrics.kpi.item-005` | AI-credit consumption by task and agent execution | Not provided | Within the assigned task budget; exact threshold not specified | Proposed AI-credit monitoring dashboard | During the pilot |

<!-- id: metrics.quality-guardrails -->

### Quality guardrails

| ID                           | Guardrail | Threshold | Measurement source | Owner |
| ---------------------------- | --------- | --------- | ------------------ | ----- |
| `metrics.guardrail.item-001` | Security and privacy by design | No applicable control may be omitted from the structured contract or release validation; detailed threshold to be defined | Security and privacy checklists and release evidence | Not confirmed |
| `metrics.guardrail.item-002` | Accessibility and usability | Applicable accessibility and usability requirements remain represented in the handoff and validation outputs; detailed threshold to be defined | Design and QA evidence | Not confirmed |
| `metrics.guardrail.item-003` | Operational completeness | Applicable Operations requirements are represented before release; detailed threshold to be defined | Operational readiness evidence | Not confirmed |
| `metrics.guardrail.item-004` | Human accountability for AI output | Human practitioners retain review and approval responsibility for generated deliverables | Pull-request, design-review, and release-review records | Not confirmed |
| `metrics.guardrail.item-005` | AI-credit budget control | Remote-agent executions remain within the budget assigned to the responsible task owner | AI-credit monitoring dashboard | Not confirmed |

<!-- id: strategic-dependencies -->

## Strategic dependencies

| ID                      | Dependency or stakeholder | Impact | Owner | Status |
| ----------------------- | ------------------------- | ------ | ----- | ------ |
| `dependencies.item-001` | Existing tools: Figma, GitHub Copilot, Jira, and Confluence | The framework depends on integrating existing tools rather than replacing them. | Not confirmed | Required |
| `dependencies.item-002` | Remote AI agents executed on Cloud infrastructure | Identified as a fundamental precondition for the framework's intended operating model. | Not confirmed | Feasibility to assess |
| `dependencies.item-003` | PagoPA Design System and Web Framework | Provides the shared design and implementation standards that agents and teams are expected to consume. | Not confirmed | Required |
| `dependencies.item-004` | Security, privacy, accessibility, usability, compliance, and operational policies | Define the controls that structured contracts and Definition of Done checks must preserve. | Not confirmed | Required |
| `dependencies.item-005` | AI-credit allocation and monitoring capability | Determines whether remote-agent usage can be governed and optimized within available budgets. | Not confirmed | Proposed |
| `dependencies.item-006` | Product, Design, Engineering, QA, and Operations leadership | Required to adopt common contracts, review outputs, and measure pilot outcomes. | Not confirmed | Required |
| `dependencies.item-007` | External partners, suppliers, and institutional stakeholders | May benefit from clearer requirements and more predictable integrations as the framework matures. | Not confirmed | Medium-term opportunity |

<!-- id: context-constraints -->

## Context and constraints

| ID                     | Area | Context or constraint | Impact | Notes |
| ---------------------- | ---- | --------------------- | ------ | ----- |
| `constraints.item-001` | Operating model | The framework should change how existing tools are structured and connected, not require teams to replace those tools. | Scope includes conventions, templates, contracts, and integrations across the current toolchain. | Confirmed by the PR-FAQ. |
| `constraints.item-002` | Lifecycle scope | The framework covers Requisition, Design, Development, QA, Documentation, and Release as an iterative lifecycle. | Each phase needs a corresponding structured contract and Definition of Done. | The source uses “Requisitazione”; this PRD renders it as Requirements. |
| `constraints.item-003` | Contract standardization | Deliverables must be understandable by both humans and downstream AI assistants. | Free-form handoffs alone are insufficient for the intended outcome. | Exact contract schemas and templates are downstream design work. |
| `constraints.item-004` | Institutional quality | The operating context requires security, accessibility, usability, compliance, and privacy-by-design considerations. | Quality and compliance cannot be treated as late-stage checks only. | Detailed control mapping is not provided in the source. |
| `constraints.item-005` | AI execution | The intended model assumes remote agents can be triggered by events and run on Cloud infrastructure. | Agent availability, permissions, isolation, observability, and governance affect feasibility. | Identified as a prerequisite in the source FAQ. |
| `constraints.item-006` | Adoption and validation | A 4-6 month pilot is proposed before complete rollout, with targets subject to validation and adjustment. | Pilot design must establish baselines and decision criteria for rollout. | Pilot participants and success-gate owner are not specified. |
| `constraints.item-007` | AI-credit budget | Each remote-agent execution draws from the AI-credit budget assigned to the responsible task owner. | The framework must make consumption visible and support budget decisions. | Exact quotas and escalation rules are not specified. |

<!-- id: feasibility-red-flags -->

## Initial feasibility red flags

| ID                   | Area | Red flag or risk | Impact | Owner | Action required |
| -------------------- | ---- | ---------------- | ------ | ----- | --------------- |
| `red-flags.item-001` | Technology | Remote cloud agents are a stated precondition, but the source does not confirm platform availability, integration boundaries, or operating controls. | The intended end-to-end flow may not be executable. | Not confirmed | Perform a formal engineering feasibility assessment. |
| `red-flags.item-002` | Technology | Structured contracts must connect multiple existing tools and lifecycle phases. | Inconsistent schemas or weak traceability could reproduce the current handoff problem in a new format. | Not confirmed | Define the minimum contract set and validate cross-tool traceability in the pilot. |
| `red-flags.item-003` | Security / Privacy | AI usage and generated outputs must operate within controlled perimeters, but data-classification, retention, access, and model-boundary decisions are not stated. | Sensitive information could be processed outside approved controls. | Not confirmed | Request formal Security and Privacy review before pilot execution. |
| `red-flags.item-004` | Legal / Compliance | The source promises compliance and privacy by design but does not identify the applicable control catalogue or approval path. | Completeness claims cannot be verified consistently. | Not confirmed | Define the required compliance evidence and formal review path. |
| `red-flags.item-005` | Operations | Agent-led production monitoring and automatic restoration are described without operational ownership, authorization boundaries, or failure-handling rules. | Automation could create service or governance risk if it acts beyond approved limits. | Not confirmed | Assess operational feasibility and define human escalation boundaries. |
| `red-flags.item-006` | Operations | The source target of eliminating identified Security, Privacy, and Operations gaps lacks a shared definition and baseline. | The completeness KPI may be impossible to measure or compare. | Not confirmed | Establish a gap taxonomy, baseline, and release-readiness measurement. |
| `red-flags.item-007` | Financial / Operations | AI-credit consumption may vary by agent execution and task complexity. | Budget pressure could limit adoption or encourage unsafe optimization. | Not confirmed | Define budget ownership, dashboard requirements, thresholds, and escalation rules. |

<!-- id: design-discovery -->

## Design discovery and Service Blueprint

Not applicable for this draft - the source is a framework-level PR-FAQ and
does not provide a product/service journey, service blueprint, research evidence,
or design artifact for the framework itself. A pilot-specific discovery should
map the current and future journeys for Product, Design, Engineering, QA, and
Operations before finalizing the operating model.

| ID | Discovery item | Reference or description | Status |
| -- | -------------- | ------------------------ | ------ |
| `design-discovery.item-001` | Pilot workflow discovery | Map the current and future handoffs across Requirements, Design, Development, QA, Documentation, and Release, including pain points and human review points. | Open - required for pilot definition |

<!-- id: open-questions -->

## Open questions, assumptions, and hypotheses

| ID | Question, assumption, or hypothesis | Blocking for review? | Owner | Expected decision date | Resolution or link |
| -- | ----------------------------------- | -------------------- | ----- | ---------------------- | ----------------- |
| `open-questions.item-001` | Who is the accountable sponsor for the framework? | Yes | Not confirmed | Not confirmed | TBD |
| `open-questions.item-002` | Who is the Product owner accountable for scope, prioritization, and pilot outcomes? | Yes | Not confirmed | Not confirmed | TBD |
| `open-questions.item-003` | Which teams and product initiatives are included in the 4-6 month pilot? | No | Not confirmed | Before pilot start | TBD |
| `open-questions.item-004` | What is the baseline and precise measurement method for lead time, requirement-misinterpretation bugs, completeness gaps, and adoption? | No | Not confirmed | Before pilot start | TBD |
| `open-questions.item-005` | What qualifies as a Security, Privacy, or Operations “gap” for the -100% completeness target? | No | Not confirmed | Before pilot start | TBD |
| `open-questions.item-006` | Which structured contracts are mandatory at each lifecycle phase, and what is the minimum acceptable Definition of Done for each phase? | No | Not confirmed | During pilot design | TBD |
| `open-questions.item-007` | What data may be shared with AI agents, under which model, retention, access, and audit controls? | No | Not confirmed | Before pilot start | TBD |
| `open-questions.item-008` | What capabilities and permissions must remote cloud agents have, and where is human approval mandatory? | No | Not confirmed | Before pilot start | TBD |
| `open-questions.item-009` | How are AI-credit budgets assigned, monitored, and reallocated across tasks and teams? | No | Not confirmed | During pilot design | TBD |
| `open-questions.item-010` | Which existing systems provide the source of truth for requirements, design, implementation, validation, documentation, and release evidence? | No | Not confirmed | During pilot design | TBD |
| `open-questions.item-011` | Is agent-led automatic production restoration in the initial framework scope or a later capability? | No | Not confirmed | Before pilot scope is approved | TBD |
| `open-questions.item-012` | What evidence is required to declare the framework ready for organization-wide rollout after the pilot? | No | Not confirmed | Before pilot start | TBD |

<!-- id: support-readiness -->

## Support readiness

| ID | Readiness question | Answer | Notes |
| -- | ----------------- | ------ | ----- |
| `support-readiness.involvement` | Is Support/Ops involvement needed? | Yes | Operations and SRE are explicitly included in the target lifecycle, but ownership and engagement model are not defined. |
| `support-readiness.knowledge-base` | Are KB, FAQ, or runbook materials needed? | To assess | The framework introduces new contracts, guidelines, and AI-agent handoffs; enablement and operational documentation are likely needed, but the source does not confirm the materials. |
| `support-readiness.user-errors` | Are relevant user errors expected? | To assess | The framework affects internal product-development work; user-facing error scenarios depend on the products selected for the pilot. |
| `support-readiness.tools` | Are support APIs or tools needed? | To assess | The source mentions monitoring and automatic restoration, but does not define support tooling or operational interfaces. |
