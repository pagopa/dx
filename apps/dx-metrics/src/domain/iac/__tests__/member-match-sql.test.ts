import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { buildMemberMatchSql } from "../member-match-sql.js";

const dialect = new PgDialect();

describe("buildMemberMatchSql", () => {
  it("renders an empty text array instead of generating IN ()", () => {
    const rendered = dialect.sqlToQuery(buildMemberMatchSql("ipr.author", []));

    expect(rendered.sql).toContain("ipr.author = ANY(ARRAY[]::text[])");
    expect(rendered.sql).not.toContain("IN ()");
    expect(rendered.params).toEqual([]);
  });

  it("renders a parameterized ANY predicate for populated member lists", () => {
    const rendered = dialect.sqlToQuery(
      buildMemberMatchSql("pr.merged_by", ["alice", "bob"]),
    );

    expect(rendered.sql).toMatch(
      /pr\.merged_by = ANY\((?:\()?ARRAY\[\$1, \$2\]::text\[\](?:\))?\)/,
    );
    expect(rendered.params).toEqual(["alice", "bob"]);
  });
});
