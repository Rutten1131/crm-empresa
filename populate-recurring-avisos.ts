import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Iniciando la pre-generación manual de avisos recurrentes...");

  // Fecha actual en Ecuador (UTC-5)
  const now = new Date();
  const ecuadorString = now.toLocaleString("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  
  const [datePart, timePart] = ecuadorString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  const secStr = String(second).padStart(2, '0');
  
  const ecuadorTime = new Date(`${year}-${mm}-${dd}T${hh}:${minStr}:${secStr}.000-05:00`);

  let cesarPhone = "+593963410409";
  let cristhopherPhone = "+593967491847";
  
  const users = await prisma.user.findMany({
    where: {
      nombre: {
        in: ["Cesar", "Cristhopher"]
      }
    }
  });
  
  const cesarUser = users.find(u => u.nombre?.toLowerCase() === "cesar");
  const cristhopherUser = users.find(u => u.nombre?.toLowerCase() === "cristhopher");
  
  if (cesarUser?.telefono) cesarPhone = cesarUser.telefono;
  if (cristhopherUser?.telefono) cristhopherPhone = cristhopherUser.telefono;

  console.log(`Usando teléfonos: César (${cesarPhone}), Cristhopher (${cristhopherPhone})`);

  // Asegurar avisos para los próximos 14 días
  let creados = 0;
  for (let i = 0; i <= 14; i++) {
    const futureDate = new Date(ecuadorTime.getTime());
    futureDate.setDate(futureDate.getDate() + i);
    
    const dayOfWeek = futureDate.getDay(); // 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
    
    if (dayOfWeek === 2 || dayOfWeek === 6) {
      const fYear = futureDate.getFullYear();
      const fMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
      const fDay = String(futureDate.getDate()).padStart(2, '0');
      
      const targetEcuadorDate = new Date(`${fYear}-${fMonth}-${fDay}T08:00:00.000-05:00`);
      
      const destinatarios = [
        { nombre: "Cesar", telefono: cesarPhone },
        { nombre: "Cristhopher", telefono: cristhopherPhone }
      ];
      
      for (const dest of destinatarios) {
        const exists = await prisma.aviso.findFirst({
          where: {
            telefono: dest.telefono,
            fechaProg: targetEcuadorDate,
            titulo: "Recordatorio: Publicar Venta de Finca \"Aroma de Montaña\""
          }
        });
        
        if (!exists) {
          await prisma.aviso.create({
            data: {
              titulo: "Recordatorio: Publicar Venta de Finca \"Aroma de Montaña\"",
              mensaje: "Recordatorio: Publicar Venta de Finca \"Aroma de Montaña\"",
              telefono: dest.telefono,
              fechaProg: targetEcuadorDate,
              estado: "PENDIENTE",
              creadoPor: "system",
              recordatorio1hEnviado: true,
              recordatorio30minEnviado: true,
              recordatorio10minEnviado: true
            }
          });
          console.log(`✅ Creado aviso para ${dest.nombre} para el ${fYear}-${fMonth}-${fDay} 08:00 AM`);
          creados++;
        } else {
          console.log(`ℹ️ El aviso para ${dest.nombre} para el ${fYear}-${fMonth}-${fDay} ya existía.`);
        }
      }
    }
  }

  console.log(`Proceso completado. Se crearon ${creados} nuevos avisos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
