import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";

import { ClientLayout } from "./ClientLayout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = skipAuth ? null : await auth();

  if (!skipAuth && !session?.user) {
    redirect("/sign-in");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <ClientLayout
      session={session}
      signOutAction={signOutAction}
      skipAuth={skipAuth}
    >
      {children}
    </ClientLayout>
  );
}
