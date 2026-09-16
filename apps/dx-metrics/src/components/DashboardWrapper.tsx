import { ReactNode, Suspense } from "react";

interface DashboardWrapperProps {
  children: ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  return (
    <Suspense
      fallback={
        <p className="text-gray-400" role="status">
          Loading dashboard data…
        </p>
      }
    >
      {children}
    </Suspense>
  );
}
