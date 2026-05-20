import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento } from "@prisma/client";

// PATCH: Actualizar el estado de un cliente manualmente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    if (!estado) {
      return NextResponse.json({ error: "Falta el campo 'estado'" }, { status: 400 });
    }

    // Validar que el estado sea correcto
    const estadosValidos = Object.values(EstadoCliente);
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Actualizar el cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: { estado },
    });

    // Si el nuevo estado es PAGADO o CERRADO, se cancelan todos los seguimientos pendientes (OMITIDO)
    if (estado === EstadoCliente.PAGADO || estado === EstadoCliente.CERRADO) {
      await prisma.seguimiento.updateMany({
        where: {
          clienteId: id,
          estado: EstadoSeguimiento.PENDIENTE,
        },
        data: {
          estado: EstadoSeguimiento.OMITIDO,
        },
      });
    }

    return NextResponse.json(clienteActualizado);
  } catch (error: any) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
