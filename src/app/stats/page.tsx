import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveStatsClient } from "@/components/stats/LiveStatsClient";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Live Stats",
  description: "Realtime website analytics dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;

  if (!configured || !authenticated) {
    notFound();
  }

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-10 md:py-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <h1 className="text-[2.2rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 sm:text-5xl">
            Website Stats
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 sm:text-base">
            Live traffic, signed-in vs guest users, devices, and top active pages.
          </p>
        </section>

        <div className="mt-6">
          <LiveStatsClient />
        </div>
      </main>
    </div>
  );
}
