import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ScopeProvider } from "@/components/ScopeProvider";
import { resolveActiveScope, SCOPE_COOKIE_NAME } from "@/lib/scope/server";
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
  const scope = resolveActiveScope(cookieStore.get(SCOPE_COOKIE_NAME)?.value);
  if (scope === null) {
    redirect("/access");
  }

  const initialCollapsed = parseSidebarCollapsed(
    cookieStore.get(sidebarCollapsedCookieName)?.value,
  );

  return (
    <ScopeProvider value={{ all: scope.all, repositories: scope.repositories }}>
      <ClientLayout initialCollapsed={initialCollapsed}>
        {children}
      </ClientLayout>
    </ScopeProvider>
  );
}
