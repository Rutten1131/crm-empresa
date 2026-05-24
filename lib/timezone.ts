/**
 * Utilidades para manejo de zonas horarias
 * Siempre usa Guayaquil/Loja, Ecuador (UTC-5) como referencia
 */

/**
 * Obtiene la fecha y hora actual en Guayaquil/Loja, Ecuador (UTC-5)
 */
export function getGuayaquilTime(): Date {
  const now = new Date();
  // Usar toLocaleString para obtener la hora correcta en Guayaquil
  const guayaquilString = now.toLocaleString("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  
  // Parsear manualmente la fecha
  const [datePart, timePart] = guayaquilString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Convierte una fecha a la zona horaria de Guayaquil/Loja
 */
export function toGuayaquilTime(date: Date): Date {
  const guayaquilString = date.toLocaleString("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  
  const [datePart, timePart] = guayaquilString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Formatea una fecha en Guayaquil para mostrar en prompts de DeepSeek
 */
export function getGuayaquilTimeString(): string {
  const now = new Date();
  // Usar toLocaleString para obtener la fecha y hora correcta en Guayaquil
  const guayaquilString = now.toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return guayaquilString;
}

/**
 * Formatea una fecha en Guayaquil en formato legible
 */
export function formatGuayaquilDate(date: Date): string {
  return date.toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
