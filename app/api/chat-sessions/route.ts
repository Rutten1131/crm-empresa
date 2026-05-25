import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const asesor = searchParams.get("asesor");

    if (!asesor) {
      return NextResponse.json({ error: "asesor es requerido" }, { status: 400 });
    }

    // Obtener todas las sesiones del asesor ordenadas por fecha descendente
    const sessions = await prisma.chatSession.findMany({
      where: { asesor },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("Error al obtener sesiones:", error);
    return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { asesor, title } = await request.json();

    if (!asesor) {
      return NextResponse.json({ error: "asesor es requerido" }, { status: 400 });
    }

    const session = await prisma.chatSession.create({
      data: {
        asesor,
        title: title || "Nuevo chat",
      },
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error al crear sesión:", error);
    return NextResponse.json({ error: "Error al crear sesión" }, { status: 500 });
  }
}
