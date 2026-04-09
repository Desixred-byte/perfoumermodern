import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return Response.json({
    configured: isAdminConfigured(),
    authenticated: validateAdminSessionToken(token),
  });
}
