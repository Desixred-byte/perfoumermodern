import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Auth",
  robots: {
    index: false,
    follow: false,
  },
};

type AuthPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const next = params.next || "/wishlist";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
