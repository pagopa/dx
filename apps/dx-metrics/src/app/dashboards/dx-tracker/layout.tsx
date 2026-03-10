import { ReactNode } from "react";
import { DashboardWrapper } from "@/components/DashboardWrapper";

export const dynamic = "force-dynamic";

export default function TrackerLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
