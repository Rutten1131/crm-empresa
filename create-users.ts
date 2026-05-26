import "dotenv/config";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
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
    console.log("Usuario Cristhopher creado exitosamente:");
    console.log("Email: cristhopher@example.com");
    console.log("Contraseña: cristhopher123");
    console.log("Rol: ADMIN");
  } else {
    console.log("Usuario Cristhopher ya existe:");
    console.log("Email: cristhopher@example.com");
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
    console.log("Usuario Cesar creado exitosamente:");
    console.log("Email: cesar@example.com");
    console.log("Contraseña: cesar123");
    console.log("Rol: ADMIN");
  } else {
    console.log("Usuario Cesar ya existe:");
    console.log("Email: cesar@example.com");
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

  console.log("\n=== Todos los usuarios en la base de datos ===");
  allUsers.forEach((user) => {
    console.log(`- ${user.nombre} (${user.email}) - Rol: ${user.role}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
