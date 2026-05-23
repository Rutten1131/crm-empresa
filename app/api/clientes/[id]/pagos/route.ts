import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TipoTransaccion } from "@prisma/client";

// GET: Obtener pagos de un cliente
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

    const pagos = await prisma.pago.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pagos);
  } catch (error: any) {
    console.error("Error al obtener pagos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Agregar un pago y registrar en finanzas
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
    const { monto, metodo, notas } = body;

    // Obtener información del cliente para la transacción
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Crear el pago
    const pago = await prisma.pago.create({
      data: {
        clienteId: id,
        monto: parseFloat(monto),
        metodo,
        notas: notas || null,
        estado: "COMPLETADO",
        fechaPago: new Date(),
      },
    });

    // Crear transacción en finanzas automáticamente
    await prisma.transaccion.create({
      data: {
        tipo: TipoTransaccion.INGRESO,
        monto: parseFloat(monto),
        descripcion: `Pago de ${cliente.nombre} - ${metodo}`,
        categoria: cliente.plan || "VENTA",
        creadoPor: session.user.id || "system",
      },
    });

    return NextResponse.json(pago);
  } catch (error: any) {
    console.error("Error al agregar pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
