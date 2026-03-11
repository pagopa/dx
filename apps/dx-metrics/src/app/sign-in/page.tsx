import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { GitHubSignInButton } from "./GitHubSignInButton";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboards/pull-requests");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">DX Metrics</h1>
        <p className="mb-8 text-gray-600">Sign in to access dashboards</p>
        <GitHubSignInButton />
      </div>
    </div>
  );
}
