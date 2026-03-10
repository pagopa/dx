import { ReactNode } from "react";
import { DashboardWrapper } from "@/components/DashboardWrapper";

export default function DxAdoptionLayout({ children }: { children: ReactNode }) {
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
