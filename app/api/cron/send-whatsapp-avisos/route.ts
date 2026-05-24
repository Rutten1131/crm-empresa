import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    
    const ecuadorTime = new Date(year, month - 1, day, hour, minute, second);
    
    // Obtener avisos pendientes para hoy
    const startOfDay = new Date(ecuadorTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(ecuadorTime);
    endOfDay.setHours(23, 59, 59, 999);
    
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
      let mensaje = `📅 *Avisos del día ${ecuadorTime.toLocaleDateString("es-EC")}*\n\n`;
      
      avisosAsesor.forEach((aviso, index) => {
        const hora = aviso.fechaProg.toLocaleTimeString("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        
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
