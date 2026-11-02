/** Landing page for a visitor without a scope. */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access — Engineering Metrics",
};

interface AccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Landing page for a visitor without a scope. It deliberately says nothing
 * about which scopes exist or which repositories they cover: the link is the
 * only thing that answers those questions.
 */
export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const isInvalid = params.invalid !== undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        <h1 className="text-lg font-semibold text-foreground">DX Metrics</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isInvalid
            ? "This link is not valid. It may have been revoked, or it was not copied completely. Ask the team that shared it for a new one."
            : "Open the link you were given to see your dashboards. The link determines which repositories you can see."}
        </p>
      </div>
    </main>
  );
}
