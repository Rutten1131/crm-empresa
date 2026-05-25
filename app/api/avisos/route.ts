import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoAviso } from "@prisma/client";
import { parseEcuadorStringToDate, formatEcuadorTimeShort } from "@/lib/timezone";

// GET: Obtener lista de avisos programados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asesor = searchParams.get("asesor");

    const whereClause = asesor ? { creadoPor: asesor } : {};

    const avisos = await prisma.aviso.findMany({
      where: whereClause,
      orderBy: {
        fechaProg: "desc",
      },
    });

    return NextResponse.json(avisos);
  } catch (error: any) {
    console.error("Error al obtener avisos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo aviso programado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { titulo, mensaje, fechaProg } = body;

    if (!titulo || !mensaje || !fechaProg) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: titulo, mensaje y fechaProg" },
        { status: 400 }
      );
    }

    // NUNCA usar teléfono del usuario, siempre usar RECONTACTO_PHONES
    const recontactPhones = process.env.RECONTACTO_PHONES || "";
    const phonesArray = recontactPhones.split(",");
    const cristhopherPhone = phonesArray[0]?.trim() || "";
    
    // Siempre usar el número de Cristhopher (por defecto) para avisos manuales
    const telefonoNormalizado = cristhopherPhone;

    // Verificar conflictos de horarios (margen de 15 minutos)
    const nuevaFecha = parseEcuadorStringToDate(fechaProg);
    const horaInicio = new Date(nuevaFecha.getTime() - 15 * 60 * 1000); // 15 minutos antes
    const horaFin = new Date(nuevaFecha.getTime() + 15 * 60 * 1000); // 15 minutos después

    const conflictos = await prisma.aviso.findMany({
      where: {
        fechaProg: {
          gte: horaInicio,
          lte: horaFin,
        },
        estado: EstadoAviso.PENDIENTE,
      },
    });

    const nuevoAviso = await prisma.aviso.create({
      data: {
        titulo,
        mensaje,
        telefono: telefonoNormalizado,
        fechaProg: nuevaFecha,
        estado: EstadoAviso.PENDIENTE,
        creadoPor: session.user.id,
      },
    });

    // Si hay conflictos, incluirlos en la respuesta
    return NextResponse.json({
      ...nuevoAviso,
      conflictos: conflictos.length > 0 ? conflictos : undefined,
      mensajeConflicto: conflictos.length > 0 
        ? `⚠️ Se detectaron ${conflictos.length} conflicto(s) de horario: ${conflictos.map(c => `"${c.titulo}" a las ${formatEcuadorTimeShort(c.fechaProg)}`).join(", ")}`
        : undefined
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear aviso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
