/**
 * Utilidades para manejo de zonas horarias
 * Siempre usa Guayaquil/Loja, Ecuador (UTC-5) como referencia
 */

/**
 * Parsea una fecha/hora que viene como string local de Ecuador (Guayaquil/Loja)
 * y retorna un objeto Date correcto (independiente de la zona horaria del servidor).
 * Soporta formatos como "YYYY-MM-DDTHH:mm", "YYYY-MM-DD HH:mm:ss", etc.
 */
export function parseEcuadorStringToDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const cleanStr = dateStr.trim();
  
  // Si ya tiene una especificación de zona horaria (Z o +XX:XX o -XX:XX), dejar que el motor la parsee.
  if (/[Z+-]\d{2}(:?\d{2})?$/.test(cleanStr)) {
    return new Date(cleanStr);
  }
  
  // Si no tiene zona horaria, asumimos que está en America/Guayaquil (UTC-5)
  // Reemplazar espacios por 'T' para asegurar formato ISO.
  const isoStr = cleanStr.includes(" ") ? cleanStr.replace(" ", "T") : cleanStr;
  
  // Agregamos el offset -05:00 para forzar la interpretación en hora de Ecuador.
  return new Date(`${isoStr}-05:00`);
}

/**
 * Formatea una fecha en Guayaquil en formato legible completo (es-EC)
 */
export function formatEcuadorDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formatea solo la fecha (es-EC, sin hora) en zona horaria de Ecuador
 */
export function formatEcuadorDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formatea solo la hora (es-EC) en zona horaria de Ecuador
 */
export function formatEcuadorTimeShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Obtiene la fecha y hora actual en Guayaquil/Loja, Ecuador (UTC-5)
 * Nota: Retorna un objeto Date local, pero con los números correspondientes a Ecuador.
 * Úsalo con cuidado si necesitas el momento absoluto.
 */
export function getGuayaquilTime(): Date {
  const now = new Date();
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
 * Mantener por compatibilidad hacia atrás
 */
export function formatGuayaquilDate(date: Date): string {
  return formatEcuadorDate(date);
}

