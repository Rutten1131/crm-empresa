import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { clienteId } = await request.json();

    if (!clienteId) {
      return NextResponse.json({ error: "clienteId es requerido" }, { status: 400 });
    }

    // Obtener todas las notas del cliente
    // @ts-ignore
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      // @ts-ignore
      include: {
        notas: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Recopilar todas las notas
    // @ts-ignore
    const todasLasNotas = [
      // @ts-ignore
      cliente.notaReseña ? `[RESEÑA] ${cliente.notaReseña}` : null,
      // @ts-ignore
      cliente.notasInicialesCRM ? `[INICIAL CRM] ${cliente.notasInicialesCRM}` : null,
      // @ts-ignore
      ...(cliente.notas || []).map((n: any) => `[${n.tipo || 'MANUAL'}] ${n.contenido}`)
    ].filter(Boolean).join('\n\n');

    if (!todasLasNotas) {
      return NextResponse.json({ message: "No hay notas para analizar" }, { status: 200 });
    }

    // Llamar a la API de DeepSeek
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!deepseekApiKey) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY no está configurada" }, { status: 500 });
    }

    const prompt = `Analiza las siguientes notas de un cliente y extrae:
1. Tareas pendientes con fechas específicas (ej: "volver a presentar mañana", "llamar el 15 de mayo")
2. Prioridad de cada tarea (alta, media, baja)
3. Acciones recomendadas

NOTAS DEL CLIENTE "${cliente.nombre}":
${todasLasNotas}

Responde en formato JSON con esta estructura:
{
  "tareas": [
    {
      "descripcion": "descripción de la tarea",
      "fecha": "YYYY-MM-DD o null si no tiene fecha específica",
      "prioridad": "alta|media|baja",
      "tipo": "llamada|presentación|seguimiento|otro"
    }
  ],
  "acciones": ["acción recomendada 1", "acción recomendada 2"],
  "resumen": "resumen breve de la situación del cliente"
}`;

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
            content: "Eres un asistente inteligente que analiza notas de clientes de ventas y extrae tareas y fechas importantes. Responde siempre en formato JSON válido."
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
    const analysis = JSON.parse(data.choices[0].message.content);

    // Marcar las notas como analizadas
    // @ts-ignore
    await prisma.nota.updateMany({
      where: { clienteId, analizado: false },
      data: { analizado: true }
    });

    // Crear avisos basados en el análisis
    // NUNCA usar teléfono del cliente, siempre usar RECONTACTO_PHONES
    const recontactPhones = process.env.RECONTACTO_PHONES || "";
    const phonesArray = recontactPhones.split(",");
    const cristhopherPhone = phonesArray[0]?.trim() || "";
    
    const avisosCreados = [];
    for (const tarea of analysis.tareas) {
      if (tarea.fecha) {
        const fechaTarea = new Date(tarea.fecha);
        // @ts-ignore
        const aviso = await prisma.aviso.create({
          data: {
            titulo: tarea.descripcion,
            mensaje: `Tarea para ${cliente.nombre}: ${tarea.descripcion}\nPrioridad: ${tarea.prioridad}\nTipo: ${tarea.tipo}\n📱 Tel: ${cliente.telefono || "Sin teléfono"}`,
            telefono: cristhopherPhone,
            fechaProg: fechaTarea,
            // @ts-ignore
            clienteId: clienteId,
            creadoPor: "deepseek-ai"
          }
        });
        avisosCreados.push(aviso);
      }
    }

    return NextResponse.json({
      analysis,
      avisosCreados: avisosCreados.length,
      tareasExtraidas: analysis.tareas.length
    });

  } catch (error: any) {
    console.error("Error al analizar notas:", error);
    return NextResponse.json(
      { error: error.message || "Error al analizar notas" },
      { status: 500 }
    );
  }
}
