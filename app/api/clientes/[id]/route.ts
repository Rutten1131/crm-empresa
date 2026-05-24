import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento, DemoReseña, MetodoPago } from "@prisma/client";
import { enviarWhatsApp } from "@/lib/evolution";
import { crearAvisosRecontacto } from "@/lib/recontactos";

// Función auxiliar para analizar notas y crear avisos automáticamente
async function analizarNotaYCrearAviso(clienteId: string, nota: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/deepseek/analyze-note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clienteId,
        nota,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Análisis de nota completado:", data);
      
      // Si el bot tiene una respuesta conversacional, la devolvemos
      if (data.analysis && data.analysis.response) {
        return {
          success: true,
          botResponse: data.analysis.response,
          needsClarification: data.analysis.needsClarification,
          clarificationQuestions: data.analysis.clarificationQuestions,
          avisoCreated: data.avisoCreated,
        };
      }
      
      return data;
    }
  } catch (error) {
    console.error("Error al analizar nota:", error);
  }
  return null;
}

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

      // Crear avisos de recontacto para los asesores (días 3, 7 y 12)
      await crearAvisosRecontacto({
        clienteId: id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        nombreNegocio: cliente.nombre_negocio,
      });

      return NextResponse.json(cliente);
    }

    // ── Paso 2: Registrar resultado de interés ──
    if (body.action === "registrar_interes") {
      const { resultado, nota, valorProducto, montoAbono, metodoPago } = body;

      // Obtener el cliente para conservar y acumular notas anteriores
      const clienteInfo = await prisma.cliente.findUnique({ where: { id } });
      if (!clienteInfo) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }

      let nuevaNota = clienteInfo.notaReseña || "";
      if (nota && nota.trim()) {
        const fechaLabel = new Date().toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const prefijo = resultado === "VOLVER_A_PRESENTAR" ? "[Seguimiento]" : resultado === "NO_INTERESADO" ? "[Cierre]" : "[Interés]";
        const entradaNota = `${prefijo} (${fechaLabel}): ${nota.trim()}`;
        nuevaNota = nuevaNota ? `${nuevaNota}\n\n${entradaNota}` : entradaNota;
      }

      const updateData: any = {
        demoReseña: resultado as DemoReseña,
        fechaReseña: new Date(),
        notaReseña: nuevaNota || null,
      };

      // Si no le interesa, cerrar el cliente
      if (resultado === "NO_INTERESADO") {
        updateData.estado = EstadoCliente.CERRADO;
      } else if (resultado === "INTERESADO" || resultado === "VOLVER_A_PRESENTAR") {
        const pValor = valorProducto ? parseFloat(valorProducto) : 0;
        if (pValor > 0) {
          updateData.montoTotal = pValor;
        }

        // Si hay abono inicial en el Paso 2
        if (montoAbono && parseFloat(montoAbono) > 0) {
          const pAbono = parseFloat(montoAbono);

          if (pValor <= 0) {
            return NextResponse.json(
              { error: "Debes ingresar el valor total del producto antes de registrar un abono" },
              { status: 400 }
            );
          }

          if (pAbono > pValor) {
            return NextResponse.json(
              { error: "El abono inicial no puede ser mayor que el valor del producto" },
              { status: 400 }
            );
          }

          // Se transforma inmediatamente de lead a cliente
          updateData.estado = EstadoCliente.PAGADO;
          // Si hace un abono, forzamos que se marque como INTERESADO para avanzar en el pipeline
          // @ts-ignore - demoReseña no está en los tipos generados por Prisma temporalmente
          updateData.demoReseña = "INTERESADO" as DemoReseña;

          // Crear el abono inicial
          await prisma.pago.create({
            data: {
              clienteId: id,
              monto: pAbono,
              metodo: (metodoPago as MetodoPago) || MetodoPago.TRANSFERENCIA,
              estado: "COMPLETADO",
              fechaPago: new Date(),
              notas: `Abono inicial — ${nota || "Marcado como Interesado"}`,
            },
          });

          // Obtener el cliente para el nombre
          const clienteInfo = await prisma.cliente.findUnique({ where: { id } });

          // Crear la transacción en finanzas (INGRESO)
          await prisma.transaccion.create({
            data: {
              tipo: "INGRESO",
              monto: pAbono,
              descripcion: `Abono inicial de ${clienteInfo?.nombre || "cliente"} - ${nota || "Interesado"}`,
              categoria: "Ventas",
              creadoPor: (session.user as any).id || "system",
            },
          });

          // Si el abono cubre el total, marcar como compra realizada
          if (pAbono === pValor) {
            updateData.compraRealizada = true;
            updateData.fechaCompra = new Date();
          } else {
            updateData.compraRealizada = false;
          }
        }
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: updateData,
      });

      // Analizar la nota para detectar fechas/horarios y crear avisos automáticamente
      let botResponse = null;
      if (nota && nota.trim()) {
        const analysisResult = await analizarNotaYCrearAviso(id, nota);
        if (analysisResult && analysisResult.botResponse) {
          botResponse = analysisResult.botResponse;
        }
      }

      // Si no se creó aviso/seguimiento desde el análisis, crear seguimiento básico
      if (nota && nota.trim()) {
        const existingSeguimiento = await prisma.seguimiento.findFirst({
          where: {
            clienteId: id,
            mensaje: nota,
          },
        });
        
        if (!existingSeguimiento) {
          await prisma.seguimiento.create({
            data: {
              clienteId: id,
              dia: new Date().getDate(),
              mensaje: nota,
              fechaProg: new Date(),
              estado: "ENVIADO",
            },
          });
        }
      }

      return NextResponse.json({ cliente, botResponse });
    }

    // ── Paso 3: Registrar pago (conectado a finanzas sin gastos) ──
    if (body.action === "registrar_pago") {
      const { monto, metodo, notas } = body;

      if (!monto || !metodo) {
        return NextResponse.json({ error: "Faltan monto o método de pago" }, { status: 400 });
      }

      const nuevoMonto = parseFloat(monto);

      // Obtener el cliente para saber su montoTotal y pagos anteriores
      const clienteInfo = await prisma.cliente.findUnique({
        where: { id },
        include: { pagos: { where: { estado: "COMPLETADO" } } }
      });

      if (!clienteInfo) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }

      const totalPrevio = clienteInfo.pagos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0);
      const totalAbonado = totalPrevio + nuevoMonto;
      const totalEsperado = clienteInfo.montoTotal ? parseFloat(clienteInfo.montoTotal.toString()) : nuevoMonto;

      // Validar que no sobrepase el precio del producto
      if (clienteInfo.montoTotal && totalAbonado > totalEsperado) {
        return NextResponse.json(
          { error: `El pago acumulado ($${totalAbonado.toFixed(2)}) supera el valor total del producto ($${totalEsperado.toFixed(2)})` },
          { status: 400 }
        );
      }

      // Crear el pago
      const pago = await prisma.pago.create({
        data: {
          clienteId: id,
          monto: nuevoMonto,
          metodo: metodo as MetodoPago,
          estado: "COMPLETADO",
          fechaPago: new Date(),
          notas: notas || null,
        },
      });

      // Crear la transacción en finanzas (INGRESO)
      await prisma.transaccion.create({
        data: {
          tipo: "INGRESO",
          monto: nuevoMonto,
          descripcion: `Pago de ${clienteInfo.nombre} - ${notas || "Abono / Cuota"}`,
          categoria: "Ventas",
          creadoPor: (session.user as any).id || "system",
        },
      });

      // Determinar si es cierre total
      const esCierreTotal = totalAbonado >= totalEsperado;

      // Actualizar estado del cliente
      const clienteActualizado = await prisma.cliente.update({
        where: { id },
        data: {
          compraRealizada: esCierreTotal,
          fechaCompra: esCierreTotal ? new Date() : null,
          montoTotal: totalEsperado,
          estado: EstadoCliente.PAGADO,
        },
      });

      return NextResponse.json({ cliente: clienteActualizado, pago });
    }

    // ── Paso 3: Registrar nota de cierre (sin pago / sin finanzas) ──
    if (body.action === "registrar_nota_cierre") {
      const { notas } = body;

      // Obtener el cliente para conservar su nota anterior si existe
      const clienteInfo = await prisma.cliente.findUnique({ where: { id } });
      if (!clienteInfo) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }

      let nuevaNota = clienteInfo.notaReseña || "";
      if (notas && notas.trim()) {
        const fechaLabel = new Date().toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const entradaNota = `[Nota Paso 3] (${fechaLabel}): ${notas.trim()}`;
        nuevaNota = nuevaNota ? `${nuevaNota}\n\n${entradaNota}` : entradaNota;
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          notaReseña: nuevaNota || null,
        },
      });

      // Analizar la nota para detectar fechas/horarios y crear avisos automáticamente
      let botResponse = null;
      if (notas && notas.trim()) {
        const analysisResult = await analizarNotaYCrearAviso(id, notas);
        if (analysisResult && analysisResult.botResponse) {
          botResponse = analysisResult.botResponse;
        }
      }

      return NextResponse.json({ cliente, botResponse });
    }


    // ── Borrar notas de conversación ──
    if (body.action === "borrar_notas") {
      const cliente = await prisma.cliente.update({
        where: { id },
        data: { notaReseña: null },
      });
      return NextResponse.json(cliente);
    }

    // ── Agregar nota adicional para clientes completados ──
    if (body.action === "agregar_nota_adicional") {
      const { nota } = body;

      if (!nota || !nota.trim()) {
        return NextResponse.json({ error: "La nota no puede estar vacía" }, { status: 400 });
      }

      // Obtener el cliente para conservar y acumular notas anteriores
      const clienteInfo = await prisma.cliente.findUnique({ where: { id } });
      if (!clienteInfo) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }

      let nuevaNota = clienteInfo.notaReseña || "";
      const fechaLabel = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const entradaNota = `[Nota Adicional] (${fechaLabel}): ${nota.trim()}`;
      nuevaNota = nuevaNota ? `${nuevaNota}\n\n${entradaNota}` : entradaNota;

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          notaReseña: nuevaNota,
        },
      });

      // Analizar la nota para detectar fechas/horarios y crear avisos automáticamente
      let botResponse = null;
      if (nota && nota.trim()) {
        const analysisResult = await analizarNotaYCrearAviso(id, nota);
        if (analysisResult && analysisResult.botResponse) {
          botResponse = analysisResult.botResponse;
        }
      }

      return NextResponse.json({ cliente, botResponse });
    }

    // ── Guardar notas iniciales para CRM (Paso 1) ──
    if (body.action === "guardar_notas_iniciales_crm") {
      const { notas } = body;

      if (!notas || !notas.trim()) {
        return NextResponse.json({ error: "Las notas no pueden estar vacías" }, { status: 400 });
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          notasInicialesCRM: notas,
          fechaNotasInicialesCRM: new Date(),
          estado: EstadoCliente.ENVIADO,
        },
      });

      // Analizar la nota para detectar fechas/horarios y crear avisos automáticamente
      let botResponse = null;
      if (notas && notas.trim()) {
        const analysisResult = await analizarNotaYCrearAviso(id, notas);
        if (analysisResult && analysisResult.botResponse) {
          botResponse = analysisResult.botResponse;
        }
      }

      return NextResponse.json({ cliente, botResponse });
    }

    // ── Guardar valor del producto (sin abono) ──
    if (body.action === "guardar_valor_producto") {
      const { valorProducto } = body;

      if (!valorProducto || parseFloat(valorProducto) <= 0) {
        return NextResponse.json({ error: "El valor del producto debe ser mayor a 0" }, { status: 400 });
      }

      const pValor = parseFloat(valorProducto);

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          montoTotal: pValor,
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

// DELETE: Eliminar cliente y todos sus datos relacionados (pagos, finanzas, avisos, seguimientos)
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

    // 1. Obtener datos del cliente para localizar transacciones por nombre
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // 2. Eliminar avisos de WhatsApp vinculados al cliente (por nombre en mensaje/título)
    await prisma.aviso.deleteMany({
      where: {
        OR: [
          { mensaje: { contains: cliente.nombre } },
          { titulo: { contains: cliente.nombre } },
        ],
      },
    });

    // 3. Eliminar transacciones financieras vinculadas al cliente (por descripción)
    await prisma.transaccion.deleteMany({
      where: {
        descripcion: { contains: cliente.nombre },
      },
    });

    // 4. Eliminar pagos (onDelete: Cascade en schema, pero lo hacemos explícito)
    await prisma.pago.deleteMany({ where: { clienteId: id } });

    // 5. Eliminar seguimientos
    await prisma.seguimiento.deleteMany({ where: { clienteId: id } });

    // 6. Eliminar el cliente en sí
    await prisma.cliente.delete({ where: { id } });

    return NextResponse.json({ success: true, message: `Cliente "${cliente.nombre}" eliminado completamente.` });
  } catch (error: any) {
    console.error("Error al eliminar cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

