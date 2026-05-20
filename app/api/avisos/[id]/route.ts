import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: Eliminar un aviso programado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const aviso = await prisma.aviso.findUnique({
      where: { id },
    });

    if (!aviso) {
      return NextResponse.json({ error: "Aviso no encontrado" }, { status: 404 });
    }

    await prisma.aviso.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Aviso eliminado con éxito" });
  } catch (error: any) {
    console.error("Error al eliminar aviso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
