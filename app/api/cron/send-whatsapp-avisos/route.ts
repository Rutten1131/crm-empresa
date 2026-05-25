import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatEcuadorDateShort, formatEcuadorTimeShort } from "@/lib/timezone";

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
    
    // Obtener avisos pendientes para hoy (UTC-5)
    const startOfDay = new Date(`${year}-${mm}-${dd}T00:00:00.000-05:00`);
    const endOfDay = new Date(`${year}-${mm}-${dd}T23:59:59.999-05:00`);
    
    const avisos = await prisma.aviso.findMany({
      where: {
        fechaProg: {
          gte: startOfDay,
          lte: endOfDay,
        },
        estado: "PENDIENTE",
      },
      orderBy: {
        fechaProg: "asc",
      },
    });

    // Agrupar avisos por asesor
    const avisosPorAsesor: { [key: string]: any[] } = {};
    avisos.forEach(aviso => {
      const asesor = aviso.creadoPor || "default";
      if (!avisosPorAsesor[asesor]) {
        avisosPorAsesor[asesor] = [];
      }
      avisosPorAsesor[asesor].push(aviso);
    });

    // Enviar avisos por asesor
    const resultados: any[] = [];
    
    for (const [asesor, avisosAsesor] of Object.entries(avisosPorAsesor)) {
      // Crear mensaje resumen para el asesor
      let mensaje = `📅 *Avisos del día ${formatEcuadorDateShort(ecuadorTime)}*\n\n`;
      
      avisosAsesor.forEach((aviso, index) => {
        const hora = formatEcuadorTimeShort(aviso.fechaProg);
        
        mensaje += `${index + 1}. *${aviso.titulo}*\n`;
        mensaje += `   🕐 ${hora}\n`;
        mensaje += `   📝 ${aviso.mensaje}\n`;
        if (aviso.telefono) {
          mensaje += `   📱 ${aviso.telefono}\n`;
        }
        mensaje += "\n";
      });
      
      mensaje += `💡 *Recordatorios:*\n`;
      mensaje += `• 1 hora antes\n`;
      mensaje += `• 30 minutos antes\n`;
      mensaje += `• 10 minutos antes\n`;
      
      // Aquí enviarías el mensaje por WhatsApp usando tu API de WhatsApp
      // Por ahora, solo lo simulamos
      console.log(`Enviando mensaje a ${asesor}:`, mensaje);
      
      resultados.push({
        asesor,
        cantidadAvisos: avisosAsesor.length,
        mensaje,
        enviado: true, // Cambiar a false si falla el envío
      });
    }

    // Marcar avisos como enviados (opcional)
    // await prisma.aviso.updateMany({
    //   where: {
    //     id: { in: avisos.map(a => a.id) },
    //   },
    //   data: { estado: "ENVIADO" },
    // });

    return NextResponse.json({
      success: true,
      fecha: ecuadorTime.toISOString(),
      totalAvisos: avisos.length,
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
