"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bot, User } from "lucide-react";
import AvisosChat from "@/components/AvisosChat";

export default function ChatPage() {
  const { data: session } = useSession();
  const [asesor, setAsesor] = useState("");

  useEffect(() => {
    if (session?.user?.name) {
      setAsesor(session.user.name);
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100 flex items-center gap-3">
            <Bot size={32} className="text-zinc-400" />
            Asistente de Avisos
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Crea avisos y recordatorios usando lenguaje natural. Estilo ChatGPT/Claude.
          </p>
        </div>

        {/* Chat Container - Full Screen Style */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden" style={{ minHeight: "calc(100vh - 200px)" }}>
          <AvisosChat onAvisoCreado={() => {}} asesor={asesor} />
        </div>
      </div>
    </div>
  );
}
