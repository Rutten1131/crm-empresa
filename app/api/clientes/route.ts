import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoCliente } from "@prisma/client";
import { crearAvisosRecontacto, cancelarAvisosRecontactoPendientes } from "@/lib/recontactos";

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

// POST: Crear o reactivar un cliente manualmente (con verificación de duplicados)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, telefono, email, nombre_negocio, tipoCliente, force, reactivate } = body;

    if (!nombre || !telefono) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: nombre y teléfono" },
        { status: 400 }
      );
    }

    // Normalizar teléfono
    const telefonoNormalizado = telefono.replace(/[^\d+]/g, "");
    if (!telefonoNormalizado) {
      return NextResponse.json(
        { error: "Número de teléfono inválido" },
        { status: 400 }
      );
    }

    // Buscar duplicados
    const clienteExistente = await prisma.cliente.findFirst({
      where: { telefono: telefonoNormalizado },
    });

    if (clienteExistente && !force && !reactivate) {
      // Retornar advertencia de duplicado
      return NextResponse.json({
        duplicate: true,
        existingCliente: {
          id: clienteExistente.id,
          nombre: clienteExistente.nombre,
          telefono: clienteExistente.telefono,
          estado: clienteExistente.estado,
        },
      });
    }

    if (clienteExistente && reactivate) {
      // Reactivar existente: Cambiar estado a PENDIENTE
      const clienteActualizado = await prisma.cliente.update({
        where: { id: clienteExistente.id },
        data: {
          nombre,
          email: email || clienteExistente.email,
          nombre_negocio: nombre_negocio || clienteExistente.nombre_negocio,
          tipoCliente: tipoCliente || clienteExistente.tipoCliente,
          estado: EstadoCliente.PENDIENTE,
        },
      });

      // Omitir seguimientos pendientes anteriores del cliente
      await prisma.seguimiento.updateMany({
        where: {
          clienteId: clienteExistente.id,
          estado: "PENDIENTE",
        },
        data: {
          estado: "OMITIDO",
        },
      });

      // Cancelar avisos de recontacto anteriores pendientes
      await cancelarAvisosRecontactoPendientes(clienteExistente.nombre);

      return NextResponse.json({ success: true, cliente: clienteActualizado });
    }

    // Si es nuevo o force: Crear un cliente nuevo sin programar seguimientos automáticos
    const nuevoCliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono: telefonoNormalizado,
        email: email || null,
        nombre_negocio: nombre_negocio || null,
        tipoCliente: tipoCliente || "PAGINA_WEB",
        estado: EstadoCliente.PENDIENTE,
      },
    });

    return NextResponse.json({ success: true, cliente: nuevoCliente });
  } catch (error: any) {
    console.error("Error al registrar cliente manualmente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

