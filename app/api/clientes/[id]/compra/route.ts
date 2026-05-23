import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Registrar compra realizada
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
    const body = await request.json();
    const { montoTotal } = body;

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        compraRealizada: true,
        fechaCompra: new Date(),
        montoTotal: montoTotal ? parseFloat(montoTotal) : null,
        estado: "PAGADO",
      },
    });

    return NextResponse.json(cliente);
  } catch (error: any) {
    console.error("Error al registrar compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
