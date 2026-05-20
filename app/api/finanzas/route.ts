import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TipoTransaccion } from "@prisma/client";

// GET: Obtener transacciones con filtros y totales del mes actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") as TipoTransaccion | null;
    const categoria = searchParams.get("categoria") || undefined;
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    // Construir filtros de fecha
    let dateFilter: any = {};
    if (desdeStr) {
      dateFilter.gte = new Date(desdeStr);
    }
    if (hastaStr) {
      // Ajustar fin de día para hastaStr (23:59:59.999)
      const hastaDate = new Date(hastaStr);
      hastaDate.setHours(23, 59, 59, 999);
      dateFilter.lte = hastaDate;
    }

    // Filtros de búsqueda para la tabla
    const whereClause: any = {
      tipo: tipo || undefined,
      categoria: categoria || undefined,
    };

    if (desdeStr || hastaStr) {
      whereClause.fecha = dateFilter;
    }

    // Obtener transacciones que coinciden con los filtros (ordenadas por fecha descendente)
    const transacciones = await prisma.transaccion.findMany({
      where: whereClause,
      orderBy: {
        fecha: "desc",
      },
    });

    // Calcular totales del mes actual para las tarjetas de resumen
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);

    const transaccionesMes = await prisma.transaccion.findMany({
      where: {
        fecha: {
          gte: inicioMes,
          lte: finMes,
        },
      },
    });

    let totalIngresosMes = 0;
    let totalGastosMes = 0;

    transaccionesMes.forEach((t) => {
      const monto = Number(t.monto);
      if (t.tipo === TipoTransaccion.INGRESO) {
        totalIngresosMes += monto;
      } else if (t.tipo === TipoTransaccion.GASTO) {
        totalGastosMes += monto;
      }
    });

    const netoMes = totalIngresosMes - totalGastosMes;

    return NextResponse.json({
      transacciones,
      resumen: {
        ingresos: totalIngresosMes,
        gastos: totalGastosMes,
        neto: netoMes,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener transacciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Crear una transacción
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, monto, descripcion, categoria, fecha } = body;

    // Validación básica
    if (!tipo || !monto || !descripcion || !categoria) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (tipo !== TipoTransaccion.INGRESO && tipo !== TipoTransaccion.GASTO) {
      return NextResponse.json(
        { error: "Tipo de transacción inválido" },
        { status: 400 }
      );
    }

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número positivo" },
        { status: 400 }
      );
    }

    const nuevaTransaccion = await prisma.transaccion.create({
      data: {
        tipo,
        monto: parsedMonto,
        descripcion,
        categoria,
        fecha: fecha ? new Date(fecha) : new Date(),
        creadoPor: session.user.id,
      },
    });

    return NextResponse.json(nuevaTransaccion, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear transacción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
