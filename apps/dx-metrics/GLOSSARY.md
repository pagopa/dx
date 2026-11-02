# DX Metrics — Glossary

The vocabulary used by the DX Metrics portal. Definitions describe meaning, not
implementation.

## Time

**Range** (also _period_, _window_)
: The interval a time-windowed dashboard reports on. It has an explicit start and
end calendar day, both inclusive.

**Available range**
: The first and last calendar days for which the portal has imported data for the
selected repositories. It bounds the range a reader can pick.

**Trailing window**
: A range expressed as "the last N days". It ends at the latest imported data
point, not at today, because the importer lags behind wall-clock time. Kept for
links created before explicit ranges existed.

**Reference date**
: The timestamp of the most recent imported data point. Describes data freshness;
it is not the end of the selected range unless the reader picks it.

**Bucket**
: The unit a time series is grouped by — a day, or a week for ranges of 240 days
or more.

## Pipelines

**Pipeline** (UI) / **Workflow** (data)
: One GitHub Actions workflow. The portal calls it a "pipeline" in labels and a
"workflow" in data. Workflows with the same name in different repositories are
reported together, prefixed with `DX` when they come from the DX repository.

**Run**
: One execution of a pipeline. It has a start, an end, a status, and a conclusion
(success, failure, cancelled, ...). A run's duration is the time between its
start and its end.

**Successful run**
: A completed run whose conclusion is success. Duration metrics use only
successful runs unless stated otherwise.

**Failed run**
: A completed run whose conclusion is failure. "Failures" counts failed runs, not
failure rate.

**Top pipelines**
: The two pipelines that rank highest on a metric within the selected range — by
average duration for the duration trend, by failed-run count for the failure
trend.

## Modules and adoption

**DX module**
: A Terraform module published by DX, either from the `pagopa-dx` registry
namespace or referenced from the `pagopa/dx` repository. Modules used through a
local path (`./`, `../`) are not DX modules and are excluded from counts.

**Module name**
: The short identity of a module, derived from its source and canonicalised
(lower case, underscores folded to hyphens): the registry module name
(`pagopa-dx/azure-role-assignments/azurerm` → `azure-role-assignments`) or the
repository/module directory name for git and HTTP sources. Usage is grouped by
module name, so the same module referenced through different URLs — including the
legacy snake_case path and the registry name — is counted once.

**Module occurrence**
: One declaration of a module in one file of one repository. A module declared in
three files of the same repository counts as three occurrences.

**Repository spread**
: The number of distinct repositories that reference a module. A module used by
twenty repositories has a spread of twenty, however many times each repository
declares it.

**Imported repository**
: A repository the importer scans. It is a subset of the organisation: the
configured repository list, independent of who is looking.

**Snapshot**
: Current state with no history. Module usage and DX pipeline usage are
snapshots: the importer replaces them on every run, so they are not affected by
the selected range.

## Visibility

**Portfolio**
: The complete set of imported repositories — everything the portal holds,
whoever is looking. Statements about "all repositories" mean "the portfolio".
_Avoid_: all repositories, organization

**Tag**
: A static label on an imported repository that groups it with other
repositories by programme or ownership. A repository may carry several tags, and
tags may overlap.
_Avoid_: label, group, team

**Scope**
: The subset of the portfolio one visitor may see, derived from the tags their
magic link carries. The full portfolio is itself a scope, not the absence of
one.
_Avoid_: permission, tenant, filter

**Magic link**
: A URL that carries a scope and grants access to it when opened. It is a shared
credential, not a personal identity: everyone holding the same link sees the
same scope.
_Avoid_: invite link, login link
