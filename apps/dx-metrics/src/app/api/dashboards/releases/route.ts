/** Route handler adapter for the releases dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { getReleasesDashboard } from "@/adapters/db/releases/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  // Public Terraform registry data: any valid scope may read it, but a scope is
  // still required.
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  try {
    const data = await getReleasesDashboard(db);
    return jsonWithNoStore(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
