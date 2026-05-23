import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento } from "@prisma/client";
import { cancelarAvisosRecontactoPendientes } from "@/lib/recontactos";

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.WEBHOOK_SECRET;

    // Validar token de seguridad del webhook
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, telefono, email, plan } = body;

    if (!nombre || !telefono) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: nombre y telefono" },
        { status: 400 }
      );
    }

    // Normalizar teléfono (remover espacios, guiones y caracteres no numéricos excepto el +)
    const telefonoNormalizado = telefono.replace(/[^\d+]/g, "");

    // Buscar si el cliente ya existe por teléfono
    const clienteExistente = await prisma.cliente.findFirst({
      where: { telefono: telefonoNormalizado },
    });

    let clientPlan = null;
    if (plan) {
      const pUpper = plan.toUpperCase();
      if (pUpper === "BASIC") clientPlan = "BASIC";
      else if (pUpper === "BUSINESS") clientPlan = "BUSINESS";
      else if (pUpper === "CATALOG") clientPlan = "CATALOG";
    }

    const hoy = new Date();
    const fechaDia3 = new Date(hoy);
    fechaDia3.setDate(hoy.getDate() + 3);

    const fechaDia7 = new Date(hoy);
    fechaDia7.setDate(hoy.getDate() + 7);

    const fechaDia15 = new Date(hoy);
    fechaDia15.setDate(hoy.getDate() + 15);

    let clienteId: string;

    if (clienteExistente) {
      clienteId = clienteExistente.id;

      // Actualizar estado del cliente a PENDIENTE (Nuevo/Reactivado)
      await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          nombre,
          email: email || clienteExistente.email,
          estado: EstadoCliente.PENDIENTE,
          plan: clientPlan ? (clientPlan as any) : undefined,
        },
      });

      // Cancelar todos los seguimientos PENDIENTES anteriores del cliente (marcar como OMITIDO)
      await prisma.seguimiento.updateMany({
        where: {
          clienteId,
          estado: EstadoSeguimiento.PENDIENTE,
        },
        data: {
          estado: EstadoSeguimiento.OMITIDO,
        },
      });

      // Cancelar avisos de recontacto anteriores pendientes (se recrearán al marcar demo)
      await cancelarAvisosRecontactoPendientes(nombre);

      console.log(`Cliente existente reactivado: ${nombre} (${telefonoNormalizado})`);
    } else {
      // Crear cliente nuevo
      const nuevoCliente = await prisma.cliente.create({
        data: {
          nombre,
          telefono: telefonoNormalizado,
          email: email || null,
          estado: EstadoCliente.PENDIENTE,
          plan: clientPlan ? (clientPlan as any) : null,
        },
      });

      clienteId = nuevoCliente.id;
      console.log(`Nuevo cliente registrado: ${nombre} (${telefonoNormalizado})`);
    }

    // Crear la nueva tanda de seguimientos para los días 3, 7 y 15
    await prisma.seguimiento.createMany({
      data: [
        {
          clienteId,
          dia: 3,
          estado: EstadoSeguimiento.PENDIENTE,
          fechaProg: fechaDia3,
        },
        {
          clienteId,
          dia: 7,
          estado: EstadoSeguimiento.PENDIENTE,
          fechaProg: fechaDia7,
        },
        {
          clienteId,
          dia: 15,
          estado: EstadoSeguimiento.PENDIENTE,
          fechaProg: fechaDia15,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      clienteId,
      message: clienteExistente ? "Cliente reactivado y seguimientos reprogramados" : "Cliente y seguimientos creados",
    });
  } catch (error: any) {
    console.error("Error en webhook de clientes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
