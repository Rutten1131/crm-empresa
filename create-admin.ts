import "dotenv/config";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const newUser = await prisma.user.create({
    data: {
      nombre: "Admin",
      email: "admin@example.com",
      telefono: "+1234567890",
      role: "ADMIN",
      password: hashedPassword,
    },
  });
  
  console.log("Usuario admin creado exitosamente:");
  console.log("Email: admin@example.com");
  console.log("Contraseña: admin123");
  console.log("Rol: ADMIN");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
