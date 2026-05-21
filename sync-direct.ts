import "dotenv/config";
import { prisma } from "./lib/prisma";
import { EstadoCliente, EstadoSeguimiento } from "@prisma/client";
import * as mariadb from "mariadb";

async function syncDirectFromActivaQR() {
  console.log("Conectando a la base de datos de ActivaQR...");
  
  const pool = mariadb.createPool({
    host: "mysql.us.stackcp.com",
    port: 42755,
    user: "Activaqrbasededatos-35303936889f",
    password: "pwye546gfr",
    database: "Activaqrbasededatos-35303936889f",
    connectionLimit: 5
  });

  let conn;
  try {
    conn = await pool.getConnection();
    console.log("¡Conexión exitosa a ActivaQR!");

    // Vamos a buscar la tabla de clientes. Podría llamarse 'clients', 'clientes', 'Users', etc.
    // Primero listamos las tablas para estar seguros
    const tables = await conn.query("SHOW TABLES");
    console.log("Tablas disponibles:", tables.map((t: any) => Object.values(t)[0]));

    // Asumimos que la tabla se llama 'clients' (como decía la documentación de la API)
    const clientesActivaQR = await conn.query("SELECT * FROM registraya_vcard_registros");
    console.log(`Se encontraron ${clientesActivaQR.length} registros en total.`);

    let nuevos = 0;
    let actualizados = 0;

    for (const c of clientesActivaQR) {
      const telefonoOriginal = c.whatsapp || c.telefono || "";
      const telefonoNormalizado = telefonoOriginal.replace(/[^\d+]/g, "");
      
      if (!telefonoNormalizado) continue;

      const clienteExistente = await prisma.cliente.findFirst({
        where: { telefono: telefonoNormalizado },
      });

      if (clienteExistente) {
        actualizados++;
      } else {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre: c.nombre || "Sin Nombre",
            telefono: telefonoNormalizado,
            email: c.email || null,
            estado: EstadoCliente.PENDIENTE,
            fechaIngreso: c.fecha_registro || c.created_at || new Date(),
          },
        });

        // Generar seguimientos (días 3, 7 y 15)
        const hoy = new Date();
        const d3 = new Date(hoy); d3.setDate(hoy.getDate() + 3);
        const d7 = new Date(hoy); d7.setDate(hoy.getDate() + 7);
        const d15 = new Date(hoy); d15.setDate(hoy.getDate() + 15);

        await prisma.seguimiento.createMany({
          data: [
            { clienteId: nuevoCliente.id, dia: 3, estado: EstadoSeguimiento.PENDIENTE, fechaProg: d3 },
            { clienteId: nuevoCliente.id, dia: 7, estado: EstadoSeguimiento.PENDIENTE, fechaProg: d7 },
            { clienteId: nuevoCliente.id, dia: 15, estado: EstadoSeguimiento.PENDIENTE, fechaProg: d15 },
          ],
        });
        
        nuevos++;
      }
    }

    console.log(`Sincronización directa completada: ${nuevos} clientes nuevos, ${actualizados} ya existían.`);

  } catch (err) {
    console.error("Error consultando la DB de ActivaQR:", err);
  } finally {
    if (conn) conn.release();
    await pool.end();
    await prisma.$disconnect();
  }
}

syncDirectFromActivaQR();
