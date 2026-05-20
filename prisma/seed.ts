import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL!.replace(/^mysql:\/\//, "mariadb://");
const adapter = new PrismaMariaDb(url);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("Contraseña123", 10);

  // 1. Crear/Actualizar usuario Cesar (ADMIN)
  const cesarEmail = "cesar@antigravity.com";
  const cesar = await prisma.user.upsert({
    where: { email: cesarEmail },
    update: {
      nombre: "Cesar",
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      nombre: "Cesar",
      email: cesarEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Usuario ADMIN Cesar sembrado:", cesar.email);

  // 2. Crear/Actualizar usuario Cristhopher (ADMIN)
  const cristhopherEmail = "cristhopher@antigravity.com";
  const cristhopher = await prisma.user.upsert({
    where: { email: cristhopherEmail },
    update: {
      nombre: "Cristhopher",
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      nombre: "Cristhopher",
      email: cristhopherEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Usuario ADMIN Cristhopher sembrado:", cristhopher.email);

  // Configuraciones iniciales por defecto (Módulo 3 y 6)
  const configurations = [
    { key: "moneda_simbolo", value: "$" },
    {
      key: "msg_dia_3",
      value: "Hola {nombre}, te escribimos desde AntiGravity. Notamos que aún tienes tu cuenta de prueba activa. ¿Tienes alguna duda que podamos resolver?",
    },
    {
      key: "msg_dia_7",
      value: "Hola {nombre}, han pasado 7 días desde que activaste tu prueba. Queremos ayudarte a sacarle el máximo provecho. ¿Agendamos una llamada rápida?",
    },
    {
      key: "msg_dia_15",
      value: "Hola {nombre}, tu período de prueba está por cerrar. Si deseas continuar, este es el momento. De lo contrario, procederemos a cerrar tu cuenta. ¡Gracias por habernos probado!",
    },
  ];

  for (const config of configurations) {
    await prisma.configuracion.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log("Configuraciones iniciales sembradas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
