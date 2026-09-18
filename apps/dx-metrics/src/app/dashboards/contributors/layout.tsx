/** This module wraps the Contributors dashboard in the shared dashboard layout. */

import { ReactNode } from "react";

import { DashboardWrapper } from "@/components/DashboardWrapper";

export const dynamic = "force-dynamic";

export default function ContributorsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
