import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  const clientes = await prisma.cliente.findMany();
  console.log("Total clientes en DB:", clientes.length);
  console.log("Clientes:", clientes);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
