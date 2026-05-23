import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  const usuarios = await prisma.user.findMany();
  console.log("=== USUARIOS EN DB ===");
  console.log("Total usuarios:", usuarios.length);
  console.log(usuarios);

  if (usuarios.length === 0) {
    console.log("\nNo hay usuarios. Necesitas crear un usuario manualmente.");
    console.log("Usa el endpoint de registro o crea uno directamente en la base de datos.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
