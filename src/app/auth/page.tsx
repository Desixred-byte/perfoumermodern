import { redirect } from "next/navigation";

type AuthPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const next = params.next || "/wishlist";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
