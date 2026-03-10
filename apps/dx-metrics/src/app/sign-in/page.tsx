import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboards/pull-requests");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">DX Metrics</h1>
        <p className="mb-8 text-gray-600">Sign in to access dashboards</p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboards/pull-requests" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-gray-700"
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
