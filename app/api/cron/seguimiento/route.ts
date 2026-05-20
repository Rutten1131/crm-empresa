import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento, EstadoAviso } from "@prisma/client";
import { sendTextMessage } from "@/lib/evolution";

// Habilitar tanto GET como POST para que se pueda testear o invocar con facilidad
export async function POST(request: NextRequest) {
  return handleCron(request);
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = request.headers.get("x-cron-secret") || searchParams.get("token");
    const expectedSecret = process.env.CRON_SECRET;

    // Validar token de seguridad
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hoy = new Date();

    // 1. PROCESAR SEGUIMIENTOS DE CLIENTES
    const seguimientosPendientes = await prisma.seguimiento.findMany({
      where: {
        estado: EstadoSeguimiento.PENDIENTE,
        fechaProg: {
          lte: hoy,
        },
      },
      include: {
        cliente: true,
      },
    });

    console.log(`Cron de Seguimiento: Encontrados ${seguimientosPendientes.length} seguimientos programados.`);

    let enviadosCount = 0;
    let omitidosCount = 0;
    let fallidosCount = 0;

    for (const seg of seguimientosPendientes) {
      const { cliente, dia } = seg;

      if (cliente.estado === EstadoCliente.PAGADO || cliente.estado === EstadoCliente.CERRADO) {
        await prisma.seguimiento.update({
          where: { id: seg.id },
          data: { estado: EstadoSeguimiento.OMITIDO },
        });
        omitidosCount++;
        continue;
      }

      const configKey = `msg_dia_${dia}`;
      const configuracion = await prisma.configuracion.findUnique({
        where: { key: configKey },
      });

      let plantilla = "";
      if (configuracion) {
        plantilla = configuracion.value;
      } else {
        if (dia === 3) {
          plantilla = "Hola {nombre}, te escribimos desde AntiGravity. Notamos que aún tienes tu cuenta de prueba activa. ¿Tienes alguna duda que podamos resolver?";
        } else if (dia === 7) {
          plantilla = "Hola {nombre}, han pasado 7 días desde que activaste tu prueba. Queremos ayudarte a sacarle el máximo provecho. ¿Agendamos una llamada rápida?";
        } else if (dia === 15) {
          plantilla = "Hola {nombre}, tu período de prueba está por cerrar. Si deseas continuar, este es el momento. De lo contrario, procederemos a cerrar tu cuenta. ¡Gracias por habernos probado!";
        }
      }

      const mensajePersonalizado = plantilla.replace(/{nombre}/g, cliente.nombre);

      if (!cliente.telefono) {
        // Skip if no phone number
        continue;
      }

      const enviado = await sendTextMessage(cliente.telefono, mensajePersonalizado);

      if (enviado) {
        await prisma.seguimiento.update({
          where: { id: seg.id },
          data: {
            estado: EstadoSeguimiento.ENVIADO,
            fechaEnvio: hoy,
            mensaje: mensajePersonalizado,
          },
        });

        if (dia === 15) {
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: { estado: EstadoCliente.CERRADO },
          });
        } else {
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: { estado: EstadoCliente.ENVIADO },
          });
        }

        enviadosCount++;
      } else {
        fallidosCount++;
      }
    }

    // 2. PROCESAR AVISOS INDEPENDIENTES
    const avisosPendientes = await prisma.aviso.findMany({
      where: {
        estado: EstadoAviso.PENDIENTE,
        fechaProg: {
          lte: hoy,
        },
      },
    });

    console.log(`Cron de Avisos: Encontrados ${avisosPendientes.length} avisos programados.`);

    let avisosEnviados = 0;
    let avisosFallidos = 0;

    for (const aviso of avisosPendientes) {
      const enviado = await sendTextMessage(aviso.telefono, aviso.mensaje);

      if (enviado) {
        await prisma.aviso.update({
          where: { id: aviso.id },
          data: { estado: EstadoAviso.ENVIADO },
        });
        avisosEnviados++;
      } else {
        await prisma.aviso.update({
          where: { id: aviso.id },
          data: { estado: EstadoAviso.FALLIDO },
        });
        avisosFallidos++;
      }
    }

    return NextResponse.json({
      success: true,
      seguimientos: {
        procesados: seguimientosPendientes.length,
        enviados: enviadosCount,
        omitidos: omitidosCount,
        fallidos: fallidosCount,
      },
      avisos: {
        procesados: avisosPendientes.length,
        enviados: avisosEnviados,
        fallidos: avisosFallidos,
      },
    });
  } catch (error: any) {
    console.error("Error en cron de seguimiento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
