import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener el historial completo de seguimientos de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const seguimientos = await prisma.seguimiento.findMany({
      where: { clienteId: id },
      orderBy: {
        fechaProg: "asc",
      },
    });

    return NextResponse.json(seguimientos);
  } catch (error: any) {
    console.error("Error al obtener seguimientos del cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
