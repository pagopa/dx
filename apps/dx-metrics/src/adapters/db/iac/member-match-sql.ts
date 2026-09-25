/** SQL helpers for matching usernames against the DX team member set. */

import { sql } from "drizzle-orm";

export type MemberMatchColumn =
  | "author"
  | "ipr.author"
  | "merged_by"
  | "pr.merged_by";

const buildTextArraySql = (members: readonly string[]) =>
  members.length === 0
    ? sql`ARRAY[]::text[]`
    : sql`ARRAY[${sql.join(
        members.map((member) => sql`${member}`),
        sql`, `,
      )}]::text[]`;

/** Builds a Postgres-safe membership predicate that also works for empty lists. */
export const buildMemberMatchSql = (
  column: MemberMatchColumn,
  members: readonly string[],
) => sql`${sql.raw(column)} = ANY(${buildTextArraySql(members)})`;
