import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
            content: `Eres un asistente que analiza notas de clientes para detectar fechas y horarios de seguimiento. 
            Tu tarea es:
            1. Detectar si la nota menciona una fecha y hora específica para un seguimiento
            2. Extraer la fecha y hora en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)
            3. Determinar el tipo de aviso (demo, seguimiento, llamada, etc.)
            4. Resumir el propósito del aviso
            
            Responde SOLO en formato JSON con esta estructura:
            {
              "hasDateTime": boolean,
              "dateTime": string (ISO 8601) o null,
              "type": string (demo/seguimiento/llamada/otro) o null,
              "summary": string (resumen del aviso) o null
            }
            
            Si no hay fecha/hora específica, hasDateTime debe ser false y los demás campos null.
            La fecha debe ser en la zona horaria de México (UTC-6).`,
          },
          {
            role: "user",
            content: `Cliente: ${cliente.nombre}\nNota: ${nota}\n\nAnaliza esta nota y detecta si hay una fecha y hora para seguimiento.`,
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
      analysis = JSON.parse(analysisContent);
    } catch (e) {
      console.error("Error al parsear respuesta de DeepSeek:", analysisContent);
      return NextResponse.json({ error: "Error al procesar el análisis" }, { status: 500 });
    }

    // Si se detectó una fecha/hora, verificar conflictos y crear aviso
    if (analysis.hasDateTime && analysis.dateTime) {
      // Verificar conflictos con avisos existentes
      const newDateTime = new Date(analysis.dateTime);
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

      // Crear el aviso
      const aviso = await prisma.aviso.create({
        data: {
          clienteId: clienteId,
          titulo: analysis.type || "Seguimiento",
          mensaje: analysis.summary || nota,
          telefono: cliente.telefono || "",
          fechaProg: newDateTime,
          estado: "PENDIENTE",
          creadoPor: "system",
        },
      });

      return NextResponse.json({
        analysis,
        avisoCreated: true,
        aviso,
        conflict: conflictingAvisos.length > 0,
        conflictingAvisos,
      });
    }

    return NextResponse.json({
      analysis,
      avisoCreated: false,
    });
  } catch (error: any) {
    console.error("Error al analizar nota:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
