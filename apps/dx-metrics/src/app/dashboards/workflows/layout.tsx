import { ReactNode } from "react";
import { DashboardWrapper } from "@/components/DashboardWrapper";

export default function WorkflowsLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
