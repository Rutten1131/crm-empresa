/**
 * Evolution API WhatsApp Client Utility
 */

export async function sendTextMessage(phone: string, message: string): Promise<boolean> {
  const url = process.env.EVOLUTION_API_URL;
  const apikey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  // Detectar si estamos en un ambiente sin configurar o con credenciales de ejemplo
  const isDummyConfig =
    !url ||
    !apikey ||
    !instance ||
    url.includes("tu-evolution-api.com") ||
    apikey === "tu-api-key" ||
    instance === "nombre-instancia";

  if (isDummyConfig) {
    console.log(`[SIMULACIÓN WHATSAPP] Enviando mensaje a ${phone}:`);
    console.log(`Mensaje: "${message}"`);
    console.log(`(Simulación exitosa ya que Evolution API no está configurada o usa valores por defecto en .env)`);
    return true;
  }

  try {
    // URL estándar de Evolution API para enviar texto
    // Ej: https://api.tu-evolution.com/message/sendText/mi-instancia
    const endpoint = `${url.replace(/\/$/, "")}/message/sendText/${instance}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apikey,
      },
      body: JSON.stringify({
        number: phone,
        options: {
          delay: 1200,
          presence: "composing",
          linkPreview: true
        },
        textMessage: {
          text: message
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de Evolution API al enviar mensaje a ${phone}: Status ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`Mensaje enviado con éxito vía Evolution API a ${phone}. ID:`, data?.key?.id || "N/A");
    return true;
  } catch (error) {
    console.error(`Error al conectar con Evolution API para enviar mensaje a ${phone}:`, error);
    return false;
  }
}
