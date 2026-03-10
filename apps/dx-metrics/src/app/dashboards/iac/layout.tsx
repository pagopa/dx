import { ReactNode } from "react";
import { DashboardWrapper } from "@/components/DashboardWrapper";

export default function IacLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
