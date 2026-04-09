import { redirect } from "next/navigation";

type AuthSuccessPageProps = {
  searchParams: Promise<{ next?: string; email?: string; pending?: string }>;
};

export default async function AuthSuccessPage({ searchParams }: AuthSuccessPageProps) {
  const params = await searchParams;
  const next = params.next || "/wishlist";
  const email = params.email || "";
  const pending = params.pending || "";

  redirect(
    `/login/success?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}&pending=${encodeURIComponent(pending)}`,
  );
}
