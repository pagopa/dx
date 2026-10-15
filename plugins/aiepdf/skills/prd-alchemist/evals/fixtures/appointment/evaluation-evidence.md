# Preliminary evaluation evidence — synthetic

- Engineering performed an initial feasibility review and assessed the
  opportunity as feasible subject to validating a legacy calendar dependency.
  This is preliminary, not formal design approval.
- Legal/Privacy completed an initial screening and found no blocking issue in
  the current problem framing; formal review is required before solution
  approval.
- Product confirmed the discovery budget and Medium priority. No delivery
  budget is approved.
- The calendar provider is a strategic dependency. Engineering Lead must
  confirm its change-notification behavior during solution design.
- The proposed Q2 2027 release remains uncommitted.
- The fee/cutoff question remains open and could change scope.

## Additional fictional evaluation evidence

This evidence is synthetic and intentionally supplements the earlier discovery
extracts. It does not change the unapproved fee/cutoff proposals.

- Product confirmed the product boundary: explore online changes to existing
  permit-renewal appointments; exclude new bookings and changes to other
  municipal services.
- The canonical resident JTBD is: “When plans change after booking a
  permit-renewal appointment, I want to request an eligible change online, so I
  can secure an updated time without calling Customer Care.” Product confirmed
  Must priority for this outcome.
- Data & Insights confirmed the July 2026 support-contact baseline of 1,200
  monthly contacts and set a planning target of no more than 900 monthly
  contacts by Q2 2027. The aggregate dashboard is the source, Data & Insights
  owns measurement, and the review date is 2027-03-31.
- Data & Insights established an eligible-change completion baseline of 61%
  from the aggregate appointment dashboard and a 75% planning target by Q2 2027. Data & Insights owns measurement and will review it on 2027-03-31.
- Engineering confirmed an accuracy guardrail of at least 99.5% correct
  appointment records after an eligible change, measured from aggregate
  scheduling audit logs. Engineering owns this measure.
- The legacy calendar provider is a dependency; the Engineering Lead owns
  confirmation of change-notification behavior by 2026-11-15.
- Initial feasibility survey: Legal/Compliance requires formal policy review
  before a fee/cutoff decision; the Legal Lead owns that review. Privacy
  requires a data-minimization check; the Privacy Lead owns it. Security
  requires an access-control assessment; the Security Lead owns it.
  Engineering must validate calendar notifications; the Engineering Lead owns
  that action. Customer Care must assess exception handling; the Customer Care
  Lead owns that action. These are open preliminary actions, not approvals.
- Design discovery is based on the early service blueprint in
  `design-discovery.md`; the concept has not been tested with residents and the
  eligible appointment types remain undecided.
- Support readiness: Customer Care involvement is needed; a new knowledge
  base, FAQ, or runbook is not required for evaluation and must be reassessed
  before delivery approval; late or ineligible change errors are expected and
  need design testing; no support API or tool is required for evaluation, with
  manual handling retained pending future assessment. Customer Care Lead owns
  the readiness review by 2026-11-15.
- The policy contradiction remains a non-blocking evaluation question owned
  jointly by the Citizen Services Director and Permit Policy Lead, with a
  decision expected by 2026-11-15. The answer affects cutoff validation,
  possible payment handling, resident messaging, and operational workflows.
- Appointment eligibility remains a non-blocking scope question owned by the
  Service Access PM, expected by 2026-11-30, with impact on the supported
  change flow.
