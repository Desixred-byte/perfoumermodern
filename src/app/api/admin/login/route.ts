import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  isAdminConfigured,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const username = payload.username?.trim() || "";
  const password = payload.password || "";

  if (!verifyAdminCredentials(username, password)) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = createAdminSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());

  return Response.json({ ok: true });
}
