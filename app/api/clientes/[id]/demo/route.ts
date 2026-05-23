import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Marcar demo como presentada
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        demoPresentada: true,
        fechaDemo: new Date(),
      },
    });

    return NextResponse.json(cliente);
  } catch (error: any) {
    console.error("Error al marcar demo como presentada:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
