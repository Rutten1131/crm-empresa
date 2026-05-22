import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento, DemoReseña } from "@prisma/client";
import { enviarWhatsApp } from "@/lib/evolution";

// PATCH: Actualizar el estado o flujo de seguimiento de un cliente
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

    // ── Paso 1: Marcar demo como presentada ──
    if (body.action === "marcar_demo") {
      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          demoPresentada: true,
          fechaDemo: new Date(),
          estado: EstadoCliente.ENVIADO,
        },
      });

      // Omitir seguimientos antiguos del sistema anterior
      await prisma.seguimiento.updateMany({
        where: { clienteId: id, estado: EstadoSeguimiento.PENDIENTE },
        data: { estado: EstadoSeguimiento.OMITIDO },
      });

      return NextResponse.json(cliente);
    }

    // ── Paso 2: Registrar resultado de interés ──
    if (body.action === "registrar_interes") {
      const { resultado, nota, enviarWhatsappMsg } = body;

      const updateData: any = {
        demoReseña: resultado as DemoReseña,
        fechaReseña: new Date(),
        notaReseña: nota || null,
      };

      // Si no le interesa, cerrar el cliente
      if (resultado === "NO_INTERESADO") {
        updateData.estado = EstadoCliente.CERRADO;
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: updateData,
      });

      // Enviar WhatsApp si se solicita y hay nota
      if (enviarWhatsappMsg && nota && cliente.telefono) {
        const whatsappResult = await enviarWhatsApp(cliente.telefono, nota);
        return NextResponse.json({ ...cliente, whatsappEnviado: whatsappResult.success, whatsappError: whatsappResult.error });
      }

      return NextResponse.json(cliente);
    }

    // ── Paso 3: Registrar pago (conectado a finanzas) ──
    if (body.action === "registrar_pago") {
      const { monto, metodo, notas, registrarGasto, montoGasto, descripcionGasto } = body;

      if (!monto || !metodo) {
        return NextResponse.json({ error: "Faltan monto o método de pago" }, { status: 400 });
      }

      // Validar gasto asociado si se solicita
      if (registrarGasto && montoGasto) {
        const pGasto = parseFloat(montoGasto);
        const pPago = parseFloat(monto);
        if (pGasto > pPago) {
          return NextResponse.json(
            { error: "El gasto asociado no puede ser mayor que el monto de la venta" },
            { status: 400 }
          );
        }
      }

      // Crear el pago
      const pago = await prisma.pago.create({
        data: {
          clienteId: id,
          monto: parseFloat(monto),
          metodo,
          estado: "COMPLETADO",
          fechaPago: new Date(),
          notas: notas || null,
        },
      });

      // Obtener el cliente para el nombre
      const clienteInfo = await prisma.cliente.findUnique({ where: { id } });

      // Crear la transacción en finanzas (INGRESO)
      await prisma.transaccion.create({
        data: {
          tipo: "INGRESO",
          monto: parseFloat(monto),
          descripcion: `Pago de ${clienteInfo?.nombre || "cliente"} - ${notas || "Activación"}`,
          categoria: "Ventas",
          creadoPor: (session.user as any).id || "system",
        },
      });

      // Crear la transacción en finanzas (GASTO) si se especificó un gasto asociado válido
      if (registrarGasto && montoGasto && parseFloat(montoGasto) > 0) {
        await prisma.transaccion.create({
          data: {
            tipo: "GASTO",
            monto: parseFloat(montoGasto),
            descripcion: `Costo asociado a lead ${clienteInfo?.nombre || "cliente"}: ${descripcionGasto || "Gasto de entrega/setup"}`,
            categoria: "Costos de Venta",
            creadoPor: (session.user as any).id || "system",
          },
        });
      }

      // Actualizar estado del cliente a PAGADO
      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          compraRealizada: true,
          fechaCompra: new Date(),
          montoTotal: parseFloat(monto),
          estado: EstadoCliente.PAGADO,
        },
      });

      return NextResponse.json({ cliente, pago });
    }

    // ── Paso 3: Registrar nota de cierre (sin pago / sin finanzas) ──
    if (body.action === "registrar_nota_cierre") {
      const { notas } = body;

      // Obtener el cliente para conservar su nota anterior si existe
      const clienteInfo = await prisma.cliente.findUnique({ where: { id } });

      const nuevaNota = notas
        ? (clienteInfo?.notaReseña ? `${clienteInfo.notaReseña}\n[Cierre]: ${notas}` : notas)
        : clienteInfo?.notaReseña;

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          compraRealizada: true,
          fechaCompra: new Date(),
          montoTotal: 0,
          notaReseña: nuevaNota,
          estado: EstadoCliente.PAGADO,
        },
      });

      return NextResponse.json(cliente);
    }


    // ── Fallback: Cambio de estado directo (legacy) ──
    const { estado } = body;

    if (!estado) {
      return NextResponse.json({ error: "Falta el campo 'estado' o 'action'" }, { status: 400 });
    }

    const estadosValidos = Object.values(EstadoCliente);
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: { estado },
    });

    if (estado === EstadoCliente.PAGADO || estado === EstadoCliente.CERRADO) {
      await prisma.seguimiento.updateMany({
        where: { clienteId: id, estado: EstadoSeguimiento.PENDIENTE },
        data: { estado: EstadoSeguimiento.OMITIDO },
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
