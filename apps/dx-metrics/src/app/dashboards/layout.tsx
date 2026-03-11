import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { ClientLayout } from "./ClientLayout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = skipAuth
    ? null
    : await auth.api.getSession({ headers: await headers() });

  if (!skipAuth && !session?.user) {
    redirect("/sign-in");
  }

  async function signOutAction() {
    "use server";
    await auth.api.signOut({ headers: await headers() });
    redirect("/sign-in");
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
