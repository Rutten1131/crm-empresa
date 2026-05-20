import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoCliente } from "@prisma/client";

// GET: Obtener lista de clientes con buscador y filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") as EstadoCliente | null;
    const search = searchParams.get("search") || "";

    const whereClause: any = {};

    if (estado) {
      whereClause.estado = estado;
    }

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search } },
        { telefono: { contains: search } },
      ];
    }

    // Obtener los clientes con sus seguimientos para calcular la fecha del próximo
    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      include: {
        seguimientos: {
          orderBy: {
            fechaProg: "asc",
          },
        },
      },
      orderBy: {
        fechaIngreso: "desc",
      },
    });

    return NextResponse.json(clientes);
  } catch (error: any) {
    console.error("Error al obtener clientes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
