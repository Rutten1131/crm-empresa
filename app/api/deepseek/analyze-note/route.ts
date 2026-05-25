import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuayaquilTimeString, formatGuayaquilDate, parseEcuadorStringToDate } from "@/lib/timezone";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { clienteId, nota } = body;

    if (!clienteId || !nota) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Obtener datos del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        notas: true,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Analizar la nota con DeepSeek para detectar fechas y horarios
    const guayaquilTime = getGuayaquilTimeString();
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Analiza nota. Si tiene fecha/hora, extrae. Si NO, responde brevemente.

UBICACIÓN: Ecuador (Guayaquil/Loja UTC-5)
HORA ACTUAL: ${guayaquilTime}

IMPORTANTE: Usa siempre la hora de Ecuador como referencia.

NOTA: "${nota}"

Si tiene fecha/hora, extrae en JSON:
{
  "hasDateTime": boolean,
  "dateTime": string (ISO 8601 zona Ecuador UTC-5) o null,
  "type": string (demo/seguimiento/llamada/otro) o null,
  "summary": string o null,
  "response": string (breve, máximo 50 palabras),
  "needsClarification": boolean,
  "clarificationQuestions": array o null
}

Si NO tiene fecha/hora, response: respuesta breve (máximo 30 palabras).`,
          },
          {
            role: "user",
            content: `Cliente: ${cliente.nombre}\nNota: ${nota}\n\nAnaliza esta nota y detecta si hay una fecha y hora para seguimiento. Usa la zona horaria de Guayaquil, Ecuador (UTC-5).`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!deepseekResponse.ok) {
      console.error("Error al llamar a DeepSeek:", await deepseekResponse.text());
      return NextResponse.json({ error: "Error al analizar la nota" }, { status: 500 });
    }

    const deepseekData = await deepseekResponse.json();
    const analysisContent = deepseekData.choices[0].message.content;

    // Parsear la respuesta de DeepSeek
    let analysis;
    try {
      // Intentar parsear como JSON
      analysis = JSON.parse(analysisContent);
    } catch (e) {
      // Si no es JSON, crear un objeto de análisis básico
      console.log("La respuesta no es JSON, usando análisis básico:", analysisContent);
      analysis = {
        hasDateTime: false,
        dateTime: null,
        type: null,
        summary: null,
        response: analysisContent,
        needsClarification: false,
        clarificationQuestions: null
      };
    }

    // Si se detectó una fecha/hora, verificar conflictos y crear seguimiento
    if (analysis.hasDateTime && analysis.dateTime) {
      // Verificar conflictos con avisos existentes
      const newDateTime = parseEcuadorStringToDate(analysis.dateTime);
      const conflictStart = new Date(newDateTime.getTime() - 30 * 60 * 1000); // 30 minutos antes
      const conflictEnd = new Date(newDateTime.getTime() + 30 * 60 * 1000); // 30 minutos después

      const conflictingAvisos = await prisma.aviso.findMany({
        where: {
          clienteId: clienteId,
          fechaProg: {
            gte: conflictStart,
            lte: conflictEnd,
          },
        },
      });

      // Crear seguimiento asociado al cliente
      const dia = newDateTime.getDate();
      console.log("Creando seguimiento para cliente:", clienteId, "con mensaje:", analysis.summary || nota);
      const seguimiento = await prisma.seguimiento.create({
        data: {
          clienteId: clienteId,
          dia: dia,
          mensaje: analysis.summary || nota,
          fechaProg: newDateTime,
          estado: "PENDIENTE",
        },
      });
      console.log("Seguimiento creado:", seguimiento);

      // Si hay conflictos, agregar pregunta de seguimiento
      if (conflictingAvisos.length > 0) {
        if (!analysis.clarificationQuestions) {
          analysis.clarificationQuestions = [];
        }
        analysis.clarificationQuestions.push(
          `Esa hora ya está ocupada con ${conflictingAvisos.length} aviso(s). ¿A qué hora prefieres agendarlo?`
        );
        analysis.needsClarification = true;
        
        return NextResponse.json({
          analysis,
          avisoCreated: false,
          seguimientoCreated: true,
          seguimiento,
          conflict: true,
          conflictingAvisos,
        });
      }

      // Crear aviso solo si no hay conflictos
      // Determinar el número de teléfono según el asesor
      const recontactPhones = process.env.RECONTACTO_PHONES || "";
      const phonesArray = recontactPhones.split(",");
      const cristhopherPhone = phonesArray[0]?.trim() || "";
      const cesarPhone = phonesArray[1]?.trim() || "";
      
      // Usar el número del cliente si tiene, si no usar el del asesor actual
      let telefono = cliente.telefono || "";
      if (!telefono) {
        // Si no hay teléfono del cliente, usar el del asesor (por defecto Cristhopher)
        telefono = cristhopherPhone;
      }
      
      const aviso = await prisma.aviso.create({
        data: {
          clienteId: clienteId,
          titulo: analysis.type || "Seguimiento",
          mensaje: analysis.summary || nota,
          telefono: telefono,
          fechaProg: newDateTime,
          estado: "PENDIENTE",
          creadoPor: "deepseek-note-analyzer",
        },
      });

      return NextResponse.json({
        analysis,
        avisoCreated: true,
        seguimientoCreated: true,
        seguimiento,
        aviso,
        conflict: conflictingAvisos.length > 0,
        conflictingAvisos,
      });
    }

    // Si no hay fecha/hora pero hay preguntas de clarificación, devolver solo la respuesta
    return NextResponse.json({
      analysis,
      avisoCreated: false,
    });
  } catch (error: any) {
    console.error("Error al analizar nota:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
