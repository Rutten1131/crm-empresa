import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoCliente, EstadoSeguimiento } from "@prisma/client";
import * as mariadb from "mariadb";

// Esta ruta debe ser dinámica, no estática
export const dynamic = "force-dynamic";

export async function GET() {
  let conn;
  let nuevos = 0;
  let actualizados = 0;

  const pool = mariadb.createPool({
    host: "mysql.us.stackcp.com",
    port: 42755,
    user: "Activaqrbasededatos-35303936889f",
    password: "pwye546gfr",
    database: "Activaqrbasededatos-35303936889f",
    connectionLimit: 5
  });

  try {
    conn = await pool.getConnection();

    const clientesActivaQR = await conn.query("SELECT * FROM registraya_vcard_registros");

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

    return NextResponse.json({ 
      success: true, 
      message: `Sincronización completada. Nuevos: ${nuevos}. Actualizados/Ya existentes: ${actualizados}.` 
    });

  } catch (err: any) {
    console.error("Error en el cron de sincronización:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}
