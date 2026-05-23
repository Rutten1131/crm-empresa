// Evolution API - WhatsApp messaging utility

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

export async function enviarWhatsApp(telefono: string, mensaje: string): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.error("Faltan variables de Evolution API");
    return { success: false, error: "Configuración de Evolution API incompleta" };
  }

  // Normalizar teléfono: quitar +, espacios, guiones
  const numero = telefono.replace(/[^\d]/g, "");

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: numero,
          text: mensaje,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error Evolution API:", response.status, errorBody);
      return { success: false, error: `Error ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true };
  } catch (err: any) {
    console.error("Error enviando WhatsApp:", err);
    return { success: false, error: err.message };
  }
}
