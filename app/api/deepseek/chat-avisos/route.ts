import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message es requerido" }, { status: 400 });
    }

    // Llamar a la API de DeepSeek
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!deepseekApiKey) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY no está configurada" }, { status: 500 });
    }

    const prompt = `Analiza el siguiente mensaje del usuario y determina si es una solicitud para crear un aviso/recordatorio.

MENSAJE: "${message}"

Si el mensaje contiene información sobre una fecha/hora específica para un recordatorio, extrae:
1. Título del aviso
2. Fecha y hora exacta (en formato YYYY-MM-DDTHH:mm)
3. Teléfono (si se menciona)
4. Descripción/mensaje del aviso

Si NO es una solicitud de aviso, responde simplemente con un mensaje conversacional apropiado.

Responde en formato JSON con esta estructura:
{
  "esAviso": true/false,
  "titulo": "título del aviso o null",
  "fecha": "YYYY-MM-DDTHH:mm o null",
  "telefono": "número de teléfono o null",
  "mensaje": "mensaje del aviso o null",
  "response": "respuesta conversacional al usuario"
}

IMPORTANTE:
- Si no se menciona un teléfono, usa un valor null
- Si la fecha es relativa (ej: "mañana", "el próximo lunes"), calcula la fecha exacta basándote en la fecha actual: ${new Date().toISOString()}
- Responde siempre en español
- Si no hay suficiente información para crear un aviso, indica qué información falta`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [
          {
            role: "system",
            content: "Eres un asistente inteligente que procesa mensajes de usuarios para crear avisos y recordatorios. Extrae información de fechas, horas y tareas del lenguaje natural. Responde siempre en formato JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error al llamar a DeepSeek API");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Si es un aviso, crearlo en la base de datos
    let avisoCreado = false;
    if (result.esAviso && result.titulo && result.fecha) {
      try {
        // Verificar conflictos de horarios
        const nuevaFecha = new Date(result.fecha);
        const horaInicio = new Date(nuevaFecha.getTime() - 60 * 60 * 1000);
        const horaFin = new Date(nuevaFecha.getTime() + 60 * 60 * 1000);

        const conflictos = await prisma.aviso.findMany({
          where: {
            fechaProg: {
              gte: horaInicio,
              lte: horaFin,
            },
            estado: "PENDIENTE",
          },
        });

        const aviso = await prisma.aviso.create({
          data: {
            titulo: result.titulo,
            mensaje: result.mensaje || result.titulo,
            telefono: result.telefono || "",
            fechaProg: nuevaFecha,
            estado: "PENDIENTE",
            creadoPor: "deepseek-chat",
          },
        });

        avisoCreado = true;

        // Agregar información de conflictos a la respuesta
        if (conflictos.length > 0) {
          result.response += `\n\n⚠️ Se detectaron ${conflictos.length} conflicto(s) de horario: ${conflictos.map(c => `"${c.titulo}" a las ${new Date(c.fechaProg).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`).join(", ")}`;
        }

        result.response += `\n\n✅ Aviso creado correctamente para el ${nuevaFecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })} a las ${nuevaFecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
      } catch (error) {
        console.error("Error al crear aviso:", error);
        result.response += "\n\n❌ Hubo un error al crear el aviso. Por favor intenta de nuevo.";
      }
    }

    return NextResponse.json({
      response: result.response,
      avisoCreado,
    });

  } catch (error: any) {
    console.error("Error al procesar mensaje:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar mensaje" },
      { status: 500 }
    );
  }
}
