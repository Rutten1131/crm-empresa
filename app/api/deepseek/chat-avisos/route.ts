import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuayaquilTimeString, parseEcuadorStringToDate, formatEcuadorTimeShort, formatEcuadorDateShort } from "@/lib/timezone";

export async function POST(request: NextRequest) {
  try {
    const { message, asesor } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message es requerido" }, { status: 400 });
    }

    // Llamar a la API de DeepSeek
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const guayaquilTime = getGuayaquilTimeString();

    if (!deepseekApiKey) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY no está configurada" }, { status: 500 });
    }

    const prompt = `Analiza el mensaje. Si es un aviso, extrae fecha/hora. Si NO es aviso, responde brevemente.

UBICACIÓN: Ecuador (Guayaquil/Loja UTC-5)
HORA ACTUAL: ${guayaquilTime}

IMPORTANTE: Usa siempre la hora de Ecuador como referencia.

MENSAJE: "${message}"

Si es aviso, extrae en JSON:
{
  "esAviso": true/false,
  "titulo": string,
  "fecha": "YYYY-MM-DDTHH:mm" (zona Ecuador UTC-5),
  "telefono": string o null,
  "mensaje": string o null,
  "response": string (breve, máximo 50 palabras)
}

Si NO es aviso, response: respuesta breve (máximo 30 palabras).`;

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

    // Si es un aviso, verificar conflictos antes de crear
    let avisoCreado = false;
    if (result.esAviso && result.titulo && result.fecha) {
      try {
        // Verificar conflictos de horarios (margen de 15 minutos)
        const nuevaFecha = parseEcuadorStringToDate(result.fecha);
        const horaInicio = new Date(nuevaFecha.getTime() - 15 * 60 * 1000);
        const horaFin = new Date(nuevaFecha.getTime() + 15 * 60 * 1000);

        const conflictos = await prisma.aviso.findMany({
          where: {
            creadoPor: asesor || "deepseek-chat",
            fechaProg: {
              gte: horaInicio,
              lte: horaFin,
            },
            estado: "PENDIENTE",
          },
        });

        // Si hay conflictos, NO crear el aviso y preguntar al usuario
        if (conflictos.length > 0) {
          result.response += `\n\n⚠️ Se detectaron ${conflictos.length} conflicto(s) de horario: ${conflictos.map(c => `"${c.titulo}" a las ${formatEcuadorTimeShort(c.fechaProg)}`).join(", ")}`;
          result.response += `\n\n❌ No se creó el aviso debido a los conflictos. Por favor, elige otra hora o confirma si deseas agendarlo igualmente.`;
          
          return NextResponse.json({
            response: result.response,
            avisoCreado: false,
            conflictos,
          });
        }

        // Si no hay conflictos, crear el aviso
        // NUNCA usar teléfono del cliente, siempre usar RECONTACTO_PHONES
        const recontactPhones = process.env.RECONTACTO_PHONES || "";
        const phonesArray = recontactPhones.split(",");
        const cristhopherPhone = phonesArray[0]?.trim() || "";
        const cesarPhone = phonesArray[1]?.trim() || "";
        
        // Siempre usar el número según el asesor, por defecto Cristhopher
        let telefono = cristhopherPhone;
        if (asesor) {
          if (asesor.toLowerCase().includes("cesar")) {
            telefono = cesarPhone;
          }
        }
        
        const aviso = await prisma.aviso.create({
          data: {
            titulo: result.titulo,
            mensaje: result.mensaje || result.titulo,
            telefono: telefono,
            fechaProg: nuevaFecha,
            estado: "PENDIENTE",
            creadoPor: asesor || "deepseek-chat",
          },
        });

        avisoCreado = true;
        result.response += `\n\n✅ Aviso creado correctamente para el ${formatEcuadorDateShort(nuevaFecha)} a las ${formatEcuadorTimeShort(nuevaFecha)}`;
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
