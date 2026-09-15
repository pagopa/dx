// Canonical cross-repository benchmark endpoint, read by `/dashboards/benchmark`.
//
// The implementation still lives next to the `overview` adapter name; this
// route exists so the API path matches the page it serves. `overview` keeps
// working as a backwards-compatible alias.
export { GET } from "../overview/route";
