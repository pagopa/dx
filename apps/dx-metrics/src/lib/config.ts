// Configuration constants - repositories are sourced from config.ts via next.config.ts.
export const ORGANIZATION = process.env.ORGANIZATION || "pagopa";

const configuredRepositories = (process.env.NEXT_PUBLIC_REPOSITORIES || "dx")
  .split(",")
  .map((repository) => repository.trim())
  .filter(Boolean);

export const REPOSITORIES = configuredRepositories;
export const DEFAULT_REPOSITORY = REPOSITORIES[0] || "dx";

export const DX_TEAM_MEMBERS = (process.env.DX_TEAM_MEMBERS || "gunzip").split(
  ",",
);

export const DX_REPO = process.env.DX_REPO || "dx";

export const BOT_AUTHORS = ["renovate-pagopa", "dependabot", "dx-pagopa-bot"];

export const TIME_INTERVALS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "120 days", value: 120 },
  { label: "240 days", value: 240 },
  { label: "300 days", value: 300 },
  { label: "360 days", value: 360 },
  { label: "720 days", value: 720 },
  { label: "1080 days", value: 1080 },
  { label: "1440 days", value: 1440 },
];
