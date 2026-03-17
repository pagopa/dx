// Configuration constants - all values are sourced from config.json and cannot be overridden via environment.
import rawConfig from "../../config.json";

export const ORGANIZATION: string = rawConfig.organization;
export const REPOSITORIES: string[] = rawConfig.repositories;
export const DEFAULT_REPOSITORY = REPOSITORIES[0] ?? "dx";
export const DX_TEAM_SLUG: string = rawConfig.dxTeamSlug;
export const DX_REPO: string = rawConfig.dxRepo;

export const BOT_AUTHORS = ["renovate-pagopa", "dependabot", "dx-pagopa-bot"];

export const TIME_INTERVALS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "120 days", value: 120 },
  { label: "240 days", value: 240 },
  { label: "300 days", value: 300 },
  { label: "360 days", value: 360 },
  { label: "720 days", value: 720 },
];
