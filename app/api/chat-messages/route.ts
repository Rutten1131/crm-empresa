import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const asesor = searchParams.get("asesor");

  if (!asesor) {
    return NextResponse.json({ error: "asesor es requerido" }, { status: 400 });
  }

  // Obtener los últimos 20 mensajes del asesor
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
    const { role, content, asesor } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: "role y content son requeridos" }, { status: 400 });
    }

    // Si no hay asesor, no guardar el mensaje (solo para demo)
    if (!asesor) {
      return NextResponse.json({ message: "Mensaje no guardado (sin asesor)" }, { status: 200 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        role,
        content,
        asesor,
      },
    });

    return NextResponse.json(message);
  } catch (error: any) {
    console.error("Error al guardar mensaje:", error);
    return NextResponse.json({ error: "Error al guardar mensaje" }, { status: 500 });
  }
}
