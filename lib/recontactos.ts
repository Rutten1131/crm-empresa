import { prisma } from "@/lib/prisma";

// Números de asesores que recibirán los avisos de recontacto
const getAsesorPhones = (): string[] => {
  const raw = process.env.RECONTACTO_PHONES || "";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

interface RecontactoParams {
  clienteId: string;
  nombre: string;
  telefono?: string | null;
  nombreNegocio?: string | null;
  plan?: string | null;
}

/**
 * Crea los 3 avisos de recontacto (días 3, 7 y 12) para cada asesor.
 * Los avisos se guardan en la tabla Aviso con estado PENDIENTE.
 * El cron de seguimiento los enviará automáticamente en la fecha programada.
 *
 * Días de recontacto:
 *   - 1er recontacto: 3 días desde hoy
 *   - 2do recontacto: 7 días desde hoy (4 días después del 1ro)
 *   - 3er recontacto: 12 días desde hoy (5 días después del 2do)
 */
export async function crearAvisosRecontacto({
  clienteId,
  nombre,
  telefono,
  nombreNegocio,
  plan,
}: RecontactoParams): Promise<void> {
  const phones = getAsesorPhones();
  if (phones.length === 0) {
    console.warn("No hay teléfonos de asesores configurados en RECONTACTO_PHONES");
    return;
  }

  const hoy = new Date();

  // Calcular las 3 fechas de recontacto
  const dia3 = new Date(hoy);
  dia3.setDate(hoy.getDate() + 3);

  const dia7 = new Date(hoy);
  dia7.setDate(hoy.getDate() + 7);

  const dia12 = new Date(hoy);
  dia12.setDate(hoy.getDate() + 12);

  const recontactos = [
    { num: 1, fecha: dia3, ordinal: "1er" },
    { num: 2, fecha: dia7, ordinal: "2do" },
    { num: 3, fecha: dia12, ordinal: "3er" },
  ];

  const avisos = [];

  for (const phone of phones) {
    for (const r of recontactos) {
      // Construir líneas de información del cliente
      const lineaNegocio = nombreNegocio
        ? `\n🏢 Negocio: ${nombreNegocio}`
        : "";
      const lineaPlan = plan
        ? `\n💼 Plan: ${plan}`
        : "";

      const mensaje =
        `🔔 Recontacto #${r.num} — ${nombre}\n` +
        `📱 Tel: ${telefono || "Sin teléfono"}` +
        lineaNegocio +
        lineaPlan +
        `\n\nEste es el ${r.ordinal} recordatorio de seguimiento para este lead.`;

      avisos.push({
        titulo: `Recontacto #${r.num} — ${nombre}`,
        mensaje,
        telefono: phone,
        fechaProg: r.fecha,
        creadoPor: "system",
      });
    }
  }

  await prisma.aviso.createMany({ data: avisos });

  console.log(
    `✅ Creados ${avisos.length} avisos de recontacto para "${nombre}" (clienteId: ${clienteId})`
  );
}

/**
 * Cancela todos los avisos de recontacto PENDIENTES que aún no se hayan enviado
 * para los números de asesores configurados. Útil al reactivar un lead duplicado.
 */
export async function cancelarAvisosRecontactoPendientes(
  nombre: string
): Promise<void> {
  const phones = getAsesorPhones();
  if (phones.length === 0) return;

  // Cancelar avisos cuyo título empiece con "Recontacto #" dirigidos a los asesores
  await prisma.aviso.updateMany({
    where: {
      telefono: { in: phones },
      estado: "PENDIENTE",
      titulo: { startsWith: `Recontacto #` },
      mensaje: { contains: nombre },
    },
    data: { estado: "FALLIDO" },
  });
}
