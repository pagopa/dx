/** Shared types for database-backed dashboard adapters. */

import type { createDatabase } from "@/db/index";

export type Database = ReturnType<typeof createDatabase>;
