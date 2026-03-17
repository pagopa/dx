"use client";

import { authClient } from "@/lib/auth-client";

/** Client component that initiates GitHub OAuth sign-in via Better Auth. */
export function GitHubSignInButton() {
  return (
    <button
      className="rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-gray-700"
      onClick={() =>
        authClient.signIn.social({
          callbackURL: "/dashboards/pull-requests",
          provider: "github",
        })
      }
      type="button"
    >
      Sign in with GitHub
    </button>
  );
}
