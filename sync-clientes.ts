import "dotenv/config";
import { prisma } from "./lib/prisma";
import { EstadoCliente, EstadoSeguimiento } from "@prisma/client";

const CRM_API_KEY = process.env.CRM_API_KEY;
const BASE_URL = "https://activaqr.com";

async function sincronizarClientes() {
  if (!CRM_API_KEY) {
    console.error("Falta CRM_API_KEY en .env");
    process.exit(1);
  }

  try {
    console.log("Obteniendo clientes pendientes de ActivaQR...");
    const response = await fetch(`${BASE_URL}/api/crm/clients-pending?limit=1000`, {
      headers: {
        "x-crm-api-key": CRM_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const clientesApi = json.data || [];
    
    console.log(`Se encontraron ${clientesApi.length} clientes pendientes en ActivaQR.`);

    let nuevos = 0;
    let actualizados = 0;

    for (const c of clientesApi) {
      const telefonoNormalizado = c.whatsapp ? c.whatsapp.replace(/[^\d+]/g, "") : null;
      if (!telefonoNormalizado) continue;

      const clienteExistente = await prisma.cliente.findFirst({
        where: { telefono: telefonoNormalizado },
      });

      if (clienteExistente) {
        // Actualizar si es necesario
        actualizados++;
      } else {
        // Crear cliente
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre: c.nombre || "Sin Nombre",
            telefono: telefonoNormalizado,
            email: c.email || null,
            estado: EstadoCliente.PENDIENTE,
            // Guardamos la fecha original si viene, sino la de hoy
            fechaIngreso: c.fecha_registro ? new Date(c.fecha_registro) : new Date(),
          },
        });

        // Generar seguimientos para este cliente (días 3, 7 y 15)
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

    console.log(`Sincronización completada: ${nuevos} clientes nuevos, ${actualizados} ya existían.`);
  } catch (error) {
    console.error("Error sincronizando:", error);
  } finally {
    await prisma.$disconnect();
  }
}

sincronizarClientes();
