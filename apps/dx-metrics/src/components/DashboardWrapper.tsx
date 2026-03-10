import { Suspense, ReactNode } from "react";

interface DashboardWrapperProps {
  children: ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      {children}
    </Suspense>
  );
}
