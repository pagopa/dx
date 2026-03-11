/** This module wraps the Techradar dashboard in the shared dashboard layout. */

import { ReactNode } from "react";

import { DashboardWrapper } from "@/components/DashboardWrapper";

export default function TechradarLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
