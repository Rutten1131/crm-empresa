import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
    }

    // Intentar usar la API principal primero (Groq)
    const primaryApiKey = process.env.SPEECH_TO_TEXT_API_KEY;
    
    if (!primaryApiKey) {
      return NextResponse.json({ error: "SPEECH_TO_TEXT_API_KEY no está configurada" }, { status: 500 });
    }
    
    try {
      const formDataGroq = new FormData();
      formDataGroq.append("file", audioFile);
      formDataGroq.append("model", "whisper-large-v3");
      formDataGroq.append("response_format", "json");
      formDataGroq.append("language", "es");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${primaryApiKey}`,
        },
        body: formDataGroq,
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ text: data.text, provider: "groq" });
      } else {
        const errorText = await response.text();
        console.error("Error en API Groq:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error con API principal, intentando fallback:", error);
    }

    // Fallback a DeepSeek si la API principal falla
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekApiKey) {
      try {
        const formDataDeepSeek = new FormData();
        formDataDeepSeek.append("file", audioFile);
        formDataDeepSeek.append("model", "whisper-large-v3");

        const response = await fetch("https://api.deepseek.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${deepseekApiKey}`,
          },
          body: formDataDeepSeek,
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ text: data.text, provider: "deepseek" });
        } else {
          const errorText = await response.text();
          console.error("Error en API DeepSeek:", response.status, errorText);
        }
      } catch (error) {
        console.error("Error con fallback a DeepSeek:", error);
      }
    }

    return NextResponse.json({ error: "No se pudo transcribir el audio con ningún proveedor" }, { status: 500 });
  } catch (error: any) {
    console.error("Error al procesar audio:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
