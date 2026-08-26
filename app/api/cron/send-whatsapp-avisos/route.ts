import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatEcuadorDateShort, formatEcuadorTimeShort } from "@/lib/timezone";
import { enviarWhatsApp } from "@/lib/evolution";

export async function GET(request: NextRequest) {
  try {
    // Obtener la fecha actual en Ecuador (UTC-5)
    const now = new Date();
    const ecuadorString = now.toLocaleString("en-US", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    
    const [datePart, timePart] = ecuadorString.split(", ");
    const [month, day, year] = datePart.split("/").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);
    
    // Formatear los números de mes y día con ceros a la izquierda
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    const secStr = String(second).padStart(2, '0');
    
    const ecuadorTime = new Date(`${year}-${mm}-${dd}T${hh}:${minStr}:${secStr}.000-05:00`);
    
    // Generar avisos recurrentes para César y Cristhopher (Martes y Sábado a las 8:00 AM)
    try {
      let cesarPhone = "+593963410409";
      let cristhopherPhone = "+593967491847";
      
      const users = await prisma.user.findMany({
        where: {
          nombre: {
            in: ["Cesar", "Cristhopher"]
          }
        },
        select: { nombre: true, telefono: true }
      });
      
      const cesarUser = users.find(u => u.nombre?.toLowerCase() === "cesar");
      const cristhopherUser = users.find(u => u.nombre?.toLowerCase() === "cristhopher");
      
      if (cesarUser?.telefono) cesarPhone = cesarUser.telefono;
      if (cristhopherUser?.telefono) cristhopherPhone = cristhopherUser.telefono;

      const destinatarios = [
        { nombre: "Cesar", telefono: cesarPhone },
        { nombre: "Cristhopher", telefono: cristhopherPhone }
      ];

      // Pre-calcular fechas de los próximos 14 días que sean Martes (2) o Sábado (6)
      const targetDates: Date[] = [];
      for (let i = 0; i <= 14; i++) {
        const futureDate = new Date(ecuadorTime.getTime());
        futureDate.setDate(futureDate.getDate() + i);
        const dayOfWeek = futureDate.getDay();
        if (dayOfWeek === 2 || dayOfWeek === 6) {
          const fYear = futureDate.getFullYear();
          const fMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
          const fDay = String(futureDate.getDate()).padStart(2, '0');
          targetDates.push(new Date(`${fYear}-${fMonth}-${fDay}T08:00:00.000-05:00`));
        }
      }

      if (targetDates.length > 0) {
        // Consultar una SOLA vez todos los avisos existentes en esas fechas
        const existingAvisos = await prisma.aviso.findMany({
          where: {
            titulo: 'Recordatorio: Publicar Venta de Finca "Aroma de Montaña"',
            fechaProg: { in: targetDates },
          },
          select: { telefono: true, fechaProg: true },
        });

        const existingSet = new Set(
          existingAvisos.map(a => `${a.telefono}_${a.fechaProg.getTime()}`)
        );

        const newAvisosToCreate = [];
        for (const targetDate of targetDates) {
          for (const dest of destinatarios) {
            const key = `${dest.telefono}_${targetDate.getTime()}`;
            if (!existingSet.has(key)) {
              newAvisosToCreate.push({
                titulo: 'Recordatorio: Publicar Venta de Finca "Aroma de Montaña"',
                mensaje: 'Recordatorio: Publicar Venta de Finca "Aroma de Montaña"',
                telefono: dest.telefono,
                fechaProg: targetDate,
                estado: "PENDIENTE" as const,
                creadoPor: "system",
                recordatorio1hEnviado: true,
                recordatorio30minEnviado: true,
                recordatorio10minEnviado: true,
              });
              existingSet.add(key);
            }
          }
        }

        if (newAvisosToCreate.length > 0) {
          await prisma.aviso.createMany({ data: newAvisosToCreate });
        }
      }
    } catch (err) {
      console.error("Error al pre-generar avisos recurrentes:", err);
    }
    
    // Obtener SOLO avisos pendientes en la ventana activa (desde hace 65 min hasta próximos 70 min)
    const startWindow = new Date(ecuadorTime.getTime() - 65 * 60 * 1000);
    const endWindow = new Date(ecuadorTime.getTime() + 70 * 60 * 1000);
    
    const avisos = await prisma.aviso.findMany({
      where: {
        fechaProg: {
          gte: startWindow,
          lte: endWindow,
        },
        estado: "PENDIENTE",
      },
      include: {
        cliente: {
          select: { id: true, estado: true }
        },
      },
      orderBy: {
        fechaProg: "asc",
      },
    });

    const resultados: any[] = [];
    
    // Procesar cada aviso para enviar recordatorios
    for (const aviso of avisos) {
      // SKIP: Si el aviso tiene cliente asociado, verificar si está CERRADO o PAGADO
      if (aviso.clienteId && aviso.cliente) {
        const estado = aviso.cliente.estado;
        if (estado === "CERRADO" || estado === "PAGADO") {
          // Marcar aviso como fallido porque el cliente ya no está activo
          await prisma.aviso.update({
            where: { id: aviso.id },
            data: { estado: "FALLIDO" },
          });
          resultados.push({ 
            avisoId: aviso.id, 
            tipo: "skip", 
            enviado: false, 
            motivo: `Cliente ${estado}` 
          });
          continue;
        }
      }

      const tiempoRestanteMs = aviso.fechaProg.getTime() - ecuadorTime.getTime();
      const tiempoRestanteMin = Math.floor(tiempoRestanteMs / (1000 * 60));
      
      // Enviar recordatorio de 1 hora antes (60 minutos o menos, pero más de 30)
      if (tiempoRestanteMin <= 60 && tiempoRestanteMin > 30 && !aviso.recordatorio1hEnviado) {
        const mensaje = `⏰ *RECORDATORIO 1H ANTES*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          (aviso.mensaje !== aviso.titulo ? `📝 ${aviso.mensaje}\n\n` : '\n') +
          `Te faltan 1 hora para este aviso.`;
        
        const resultado = await enviarWhatsApp(aviso.telefono, mensaje);
        
        if (resultado.success) {
          await prisma.aviso.update({
            where: { id: aviso.id },
            data: { recordatorio1hEnviado: true },
          });
          resultados.push({ avisoId: aviso.id, tipo: "1h", enviado: true });
        } else {
          resultados.push({ avisoId: aviso.id, tipo: "1h", enviado: false, error: resultado.error });
        }
      }
      
      // Enviar recordatorio de 30 minutos antes (30 minutos o menos, pero más de 10)
      if (tiempoRestanteMin <= 30 && tiempoRestanteMin > 10 && !aviso.recordatorio30minEnviado) {
        const mensaje = `⏰ *RECORDATORIO 30 MIN ANTES*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          (aviso.mensaje !== aviso.titulo ? `📝 ${aviso.mensaje}\n\n` : '\n') +
          `Te faltan 30 minutos para este aviso.`;
        
        const resultado = await enviarWhatsApp(aviso.telefono, mensaje);
        
        if (resultado.success) {
          await prisma.aviso.update({
            where: { id: aviso.id },
            data: { recordatorio30minEnviado: true },
          });
          resultados.push({ avisoId: aviso.id, tipo: "30min", enviado: true });
        } else {
          resultados.push({ avisoId: aviso.id, tipo: "30min", enviado: false, error: resultado.error });
        }
      }
      
      // Enviar recordatorio de 10 minutos antes (10 minutos o menos, pero más de 0)
      if (tiempoRestanteMin <= 10 && tiempoRestanteMin > 0 && !aviso.recordatorio10minEnviado) {
        const mensaje = `⏰ *RECORDATORIO 10 MIN ANTES*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          (aviso.mensaje !== aviso.titulo ? `📝 ${aviso.mensaje}\n\n` : '\n') +
          `Te faltan 10 minutos para este aviso.`;
        
        const resultado = await enviarWhatsApp(aviso.telefono, mensaje);
        
        if (resultado.success) {
          await prisma.aviso.update({
            where: { id: aviso.id },
            data: { recordatorio10minEnviado: true },
          });
          resultados.push({ avisoId: aviso.id, tipo: "10min", enviado: true });
        } else {
          resultados.push({ avisoId: aviso.id, tipo: "10min", enviado: false, error: resultado.error });
        }
      }
      
      // Enviar aviso en el momento exacto (0 minutos o menos, pero más de -60)
      if (tiempoRestanteMin <= 0 && tiempoRestanteMin > -60 && aviso.estado === "PENDIENTE") {
        const mensaje = `🔔 *AVISO AHORA*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          (aviso.mensaje !== aviso.titulo ? `📝 ${aviso.mensaje}` : '');
        
        const resultado = await enviarWhatsApp(aviso.telefono, mensaje);
        
        if (resultado.success) {
          await prisma.aviso.update({
            where: { id: aviso.id },
            data: { estado: "ENVIADO" },
          });
          resultados.push({ avisoId: aviso.id, tipo: "aviso", enviado: true });
        } else {
          resultados.push({ avisoId: aviso.id, tipo: "aviso", enviado: false, error: resultado.error });
        }
      }
    }

    return NextResponse.json({
      success: true,
      fecha: ecuadorTime.toISOString(),
      totalAvisos: avisos.length,
      recordatoriosEnviados: resultados.length,
      resultados,
    });
  } catch (error: any) {
    console.error("Error al enviar avisos de WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Error al enviar avisos" },
      { status: 500 }
    );
  }
}
