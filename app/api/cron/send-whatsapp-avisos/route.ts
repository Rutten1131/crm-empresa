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
    
    // Obtener avisos pendientes para hoy y próximos 7 días (UTC-5)
    const startOfDay = new Date(`${year}-${mm}-${dd}T00:00:00.000-05:00`);
    const endOfPeriod = new Date(`${year}-${mm}-${dd}T23:59:59.999-05:00`);
    endOfPeriod.setDate(endOfPeriod.getDate() + 7);
    
    const avisos = await prisma.aviso.findMany({
      where: {
        fechaProg: {
          gte: startOfDay,
          lte: endOfPeriod,
        },
        estado: "PENDIENTE",
      },
      orderBy: {
        fechaProg: "asc",
      },
    });

    const resultados: any[] = [];
    
    // Procesar cada aviso para enviar recordatorios
    for (const aviso of avisos) {
      const tiempoRestanteMs = aviso.fechaProg.getTime() - ecuadorTime.getTime();
      const tiempoRestanteMin = Math.floor(tiempoRestanteMs / (1000 * 60));
      
      // Enviar recordatorio de 1 hora antes (60 minutos o menos, pero más de 30)
      if (tiempoRestanteMin <= 60 && tiempoRestanteMin > 30 && !aviso.recordatorio1hEnviado) {
        const mensaje = `⏰ *RECORDATORIO 1H ANTES*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          `📝 ${aviso.mensaje}\n\n` +
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
          `📝 ${aviso.mensaje}\n\n` +
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
          `📝 ${aviso.mensaje}\n\n` +
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
      
      // Enviar aviso en el momento exacto (0 minutos o menos, pero más de -5)
      if (tiempoRestanteMin <= 0 && tiempoRestanteMin > -5 && aviso.estado === "PENDIENTE") {
        const mensaje = `🔔 *AVISO AHORA*\n\n` +
          `📌 *${aviso.titulo}*\n` +
          `🕐 ${formatEcuadorTimeShort(aviso.fechaProg)}\n` +
          `📝 ${aviso.mensaje}`;
        
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
