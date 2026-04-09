import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { getAdminData } from "@/lib/admin-data";
import { notesToCsv, perfumesToCsv } from "@/lib/admin-csv";

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "perfumes").toLowerCase();

  const { perfumes, notes } = await getAdminData();

  if (type === "notes") {
    const csv = notesToCsv(notes);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=notes-export-${Date.now()}.csv`,
      },
    });
  }

  const csv = perfumesToCsv(perfumes);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=perfumes-export-${Date.now()}.csv`,
    },
  });
}
