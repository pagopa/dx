import { cookies } from "next/headers";

import {
  parseSidebarCollapsed,
  sidebarCollapsedCookieName,
} from "@/lib/sidebar-state";

import { ClientLayout } from "./ClientLayout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialCollapsed = parseSidebarCollapsed(
    cookieStore.get(sidebarCollapsedCookieName)?.value,
  );

  return (
    <ClientLayout initialCollapsed={initialCollapsed}>{children}</ClientLayout>
  );
}
