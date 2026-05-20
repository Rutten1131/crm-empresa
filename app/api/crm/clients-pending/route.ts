import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Validates the x-crm-api-key header against the env variable.
 */
function validateKey(request: NextRequest): boolean {
  const provided = request.headers.get("x-crm-api-key");
  const expected = process.env.CRM_API_KEY;
  return !!provided && provided === expected;
}

/**
 * GET /api/crm/clients-pending
 * Returns a paginated list of clients with status = PENDIENTE.
 * Query params: limit (default 100), offset (default 0)
 */
export async function GET(request: NextRequest) {
  if (!validateKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const limit = Number(url.searchParams.get("limit")) || 100;
  const offset = Number(url.searchParams.get("offset")) || 0;

  try {
    const [total, clients] = await Promise.all([
      prisma.cliente.count({ where: { estado: "PENDIENTE" } }),
      prisma.cliente.findMany({
        where: { estado: "PENDIENTE" },
        skip: offset,
        take: limit,
        orderBy: { fechaIngreso: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      meta: { total, limit, offset, has_more: offset + clients.length < total },
      data: clients,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
