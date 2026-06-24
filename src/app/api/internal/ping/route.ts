import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/lib/service-auth";

// Endpoint de ejemplo server-to-server.
// Demuestra el patrón: validar X-Service-Token antes de ejecutar la lógica.
// Cada fork copia este patrón en sus endpoints internos según preview/03-apis.md.
export async function POST(request: NextRequest) {
  const denied = requireServiceToken(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    received: true,
    echo: body,
    at: new Date().toISOString(),
  });
}
