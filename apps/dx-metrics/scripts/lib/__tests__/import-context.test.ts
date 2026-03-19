import { describe, expect, it } from "vitest";

import {
  resolveDxTeamMembers,
  type TeamMembersClient,
} from "../import-context.js";

type TeamMembersCall = [
  string,
  { org: string; per_page: number; team_slug: string },
];

describe("resolveDxTeamMembers", () => {
  it("resolves members from the configured GitHub team slug", async () => {
    const calls: TeamMembersCall[] = [];
    const teamMembersClient: TeamMembersClient = {
      paginate: async (route, parameters, mapFn) => {
        calls.push([route, parameters]);
        return [
          ...mapFn({
            data: [{ login: "zoe" }, { login: "alice" }, { login: "alice" }],
          }),
        ];
      },
    };

    const members = await resolveDxTeamMembers(teamMembersClient, {
      dxTeamSlug: "engineering-team-devex",
      organization: "pagopa",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe("GET /orgs/{org}/teams/{team_slug}/members");
    expect(calls[0]?.[1]).toEqual({
      org: "pagopa",
      per_page: 100,
      team_slug: "engineering-team-devex",
    });
    expect(members).toEqual(["alice", "zoe"]);
  });

  it("returns a sorted unique member list from the GitHub response", async () => {
    const teamMembersClient: TeamMembersClient = {
      paginate: async (_route, _parameters, mapFn) =>
        mapFn({
          data: [{ login: "zoe" }, { login: "alice" }, { login: "alice" }],
        }),
    };

    const members = await resolveDxTeamMembers(teamMembersClient, {
      dxTeamSlug: "engineering-team-devex",
      organization: "pagopa",
    });

    expect(members).toEqual(["alice", "zoe"]);
  });
});
