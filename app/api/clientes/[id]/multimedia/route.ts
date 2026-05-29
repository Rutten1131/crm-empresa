import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE!;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST!;
const BUNNY_PULLZONE_URL = process.env.BUNNY_PULLZONE_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const multimedia = await prisma.clienteMultimedia.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(multimedia);
  } catch (error) {
    console.error("Error al obtener multimedia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const nota = formData.get("nota") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validar tamaño (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo excede 100MB" }, { status: 400 });
    }

    // Determinar tipo
    const mimeType = file.type.toLowerCase();
    let tipo: string;
    if (mimeType.startsWith("image/")) tipo = "image";
    else if (mimeType.startsWith("video/")) tipo = "video";
    else if (mimeType.startsWith("audio/")) tipo = "audio";
    else tipo = "document";

    // Extraer extensión
    const extension = mimeType.split("/")[1] || "bin";
    const nombreOriginal = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const nombreArchivo = `${id}/${Date.now()}-${nombreOriginal}`;

    // Leer archivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Bunny.net Storage
    const bunnyUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${nombreArchivo}`;
    
    const bunnyResponse = await fetch(bunnyUrl, {
      method: "PUT",
      headers: {
        "AccessKey": BUNNY_STORAGE_API_KEY,
        "Content-Type": mimeType,
      },
      body: buffer,
    });

    if (!bunnyResponse.ok) {
      console.error("Error al subir a Bunny:", await bunnyResponse.text());
      return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
    }

    // URL pública
    const url = `${BUNNY_PULLZONE_URL}/${nombreArchivo}`;

    // Guardar en BD
    const multimedia = await prisma.clienteMultimedia.create({
      data: {
        clienteId: id,
        nombre: nombreOriginal,
        tipo,
        extension,
        url,
        tamaño: file.size,
        nota: nota || null,
      },
    });

    return NextResponse.json(multimedia);
  } catch (error) {
    console.error("Error al subir multimedia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const multimediaId = searchParams.get("multimediaId");

  if (!multimediaId) {
    return NextResponse.json({ error: "ID de multimedia requerido" }, { status: 400 });
  }

  try {
    // Obtener info del archivo para eliminar de Bunny
    const multimedia = await prisma.clienteMultimedia.findUnique({
      where: { id: multimediaId },
    });

    if (!multimedia) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    // Extraer path de Bunny de la URL
    const urlObj = new URL(multimedia.url);
    const pathParts = urlObj.pathname.split("/");
    const bunnyPath = pathParts.slice(pathParts.indexOf(BUNNY_STORAGE_ZONE) + 1).join("/");

    // Eliminar de Bunny Storage
    const bunnyUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;
    await fetch(bunnyUrl, {
      method: "DELETE",
      headers: {
        "AccessKey": BUNNY_STORAGE_API_KEY,
      },
    });

    // Eliminar de BD
    await prisma.clienteMultimedia.delete({
      where: { id: multimediaId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar multimedia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
