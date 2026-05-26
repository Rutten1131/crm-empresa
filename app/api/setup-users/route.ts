import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    // Verificar y crear Cristhopher
    let cristhopher = await prisma.user.findUnique({
      where: { email: "cristhopher@example.com" },
    });

    if (!cristhopher) {
      const hashedPassword = await bcrypt.hash("cristhopher123", 10);
      cristhopher = await prisma.user.create({
        data: {
          nombre: "Cristhopher",
          email: "cristhopher@example.com",
          telefono: "+593967491847",
          role: "ADMIN",
          password: hashedPassword,
        },
      });
    }

    // Verificar y crear Cesar
    let cesar = await prisma.user.findUnique({
      where: { email: "cesar@example.com" },
    });

    if (!cesar) {
      const hashedPassword = await bcrypt.hash("cesar123", 10);
      cesar = await prisma.user.create({
        data: {
          nombre: "Cesar",
          email: "cesar@example.com",
          telefono: "+593963410409",
          role: "ADMIN",
          password: hashedPassword,
        },
      });
    }

    // Listar todos los usuarios
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Usuarios verificados y creados exitosamente",
      users: allUsers,
    });
  } catch (error) {
    console.error("Error al crear usuarios:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear usuarios" },
      { status: 500 }
    );
  }
}
