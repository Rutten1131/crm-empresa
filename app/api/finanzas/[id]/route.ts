import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: Eliminar una transacción (Solo para administradores)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Restricción estricta de Rol: Solo ADMIN puede borrar transacciones
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permiso denegado. Solo los administradores pueden borrar transacciones." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar si existe la transacción
    const transaccion = await prisma.transaccion.findUnique({
      where: { id },
    });

    if (!transaccion) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      );
    }

    await prisma.transaccion.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Transacción eliminada con éxito" });
  } catch (error: any) {
    console.error("Error al eliminar transacción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
