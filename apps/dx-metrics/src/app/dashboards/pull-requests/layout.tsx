import { ReactNode } from "react";
import { DashboardWrapper } from "@/components/DashboardWrapper";

export default function PullRequestsLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
