import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const asesor = searchParams.get("asesor");
    const sessionId = searchParams.get("sessionId");

  if (!asesor) {
    return NextResponse.json({ error: "asesor es requerido" }, { status: 400 });
  }

  // Si se proporciona sessionId, obtener mensajes de esa sesión
  if (sessionId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }

  // Si no, obtener los últimos 20 mensajes del asesor (compatibilidad con código antiguo)
  const messages = await prisma.chatMessage.findMany({
    where: { asesor },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Error al obtener mensajes:", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { role, content, asesor, sessionId } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: "role y content son requeridos" }, { status: 400 });
    }

    // Si no hay asesor, no guardar el mensaje (solo para demo)
    if (!asesor) {
      return NextResponse.json({ message: "Mensaje no guardado (sin asesor)" }, { status: 200 });
    }

    // Si no hay sessionId, crear una nueva sesión
    let actualSessionId = sessionId;
    if (!actualSessionId) {
      const session = await prisma.chatSession.create({
        data: {
          asesor,
          title: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        },
      });
      actualSessionId = session.id;
    }

    const message = await prisma.chatMessage.create({
      data: {
        role,
        content,
        asesor,
        sessionId: actualSessionId,
      },
    });

    return NextResponse.json({ ...message, sessionId: actualSessionId });
  } catch (error: any) {
    console.error("Error al guardar mensaje:", error);
    return NextResponse.json({ error: "Error al guardar mensaje" }, { status: 500 });
  }
}
