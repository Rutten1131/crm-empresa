import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Sync pending clients from the external ActivaQR CRM.
 * Uses the endpoint defined in CRM_API_DOCUMENTATION.md:
 *   GET https://activaqr.com/api/crm/clients-pending
 * Requires the header `x-crm-api-key` with the key defined in `.env` as CRM_API_KEY.
 */
export async function POST(request: NextRequest) {
  // Authenticate (only ADMIN can trigger sync)
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CRM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CRM API key not configured" }, { status: 500 });
  }

  const baseUrl = "https://activaqr.com";
  const endpoint = `${baseUrl}/api/crm/clients-pending?limit=200`;

  try {
    const externalRes = await fetch(endpoint, {
      headers: {
        "x-crm-api-key": apiKey,
      },
    });

    if (!externalRes.ok) {
      const errText = await externalRes.text();
      return NextResponse.json({ error: "Failed to fetch external clients", details: errText }, { status: externalRes.status });
    }

    const data = await externalRes.json();
    const clients = data.data as any[];

    // Upsert each client into our database
    const upsertPromises = clients.map((c) =>
      prisma.cliente.upsert({
        where: { id: c.id },
        update: {
          nombre: c.nombre,
          nombre_negocio: c.nombre_negocio ?? "",
          email: c.email ?? "",
          whatsapp: c.whatsapp ?? "",
          status: c.status as any,
          plan: c.plan as any,
          fecha_pendiente: c.fecha_pendiente ? new Date(c.fecha_pendiente) : undefined,
          activated_at: c.fecha_activacion ? new Date(c.fecha_activacion) : null,
          expires_at: c.fecha_expiracion ? new Date(c.fecha_expiracion) : null,
          seller_id: c.seller_id ?? null,
          vendedor_nombre: c.vendedor_nombre ?? "",
          vendedor_codigo: c.vendedor_codigo ?? "",
        },
        create: {
          id: c.id,
          nombre: c.nombre,
          nombre_negocio: c.nombre_negocio ?? "",
          email: c.email ?? "",
          whatsapp: c.whatsapp ?? "",
          status: c.status as any,
          plan: c.plan as any,
          fecha_pendiente: c.fecha_pendiente ? new Date(c.fecha_pendiente) : undefined,
          activated_at: c.fecha_activacion ? new Date(c.fecha_activacion) : null,
          expires_at: c.fecha_expiracion ? new Date(c.fecha_expiracion) : null,
          seller_id: c.seller_id ?? null,
          vendedor_nombre: c.vendedor_nombre ?? "",
          vendedor_codigo: c.vendedor_codigo ?? "",
        },
      })
    );

    await Promise.all(upsertPromises);

    return NextResponse.json({ success: true, imported: clients.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Unexpected error", details: error.message }, { status: 500 });
  }
}
