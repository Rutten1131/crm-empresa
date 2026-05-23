"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AvisosChatProps {
  onAvisoCreado: () => void;
}

export default function AvisosChat({ onAvisoCreado }: AvisosChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente de avisos. Puedes decirme cosas como: \"Tengo una reunión mañana a las 3pm con Juan\" o \"Recordarme llamar a María el 15 de mayo a las 10am\" y yo crearé el aviso automáticamente."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/deepseek/chat-avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Error al procesar el mensaje");

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      
      if (data.avisoCreado) {
        onAvisoCreado();
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bot size={18} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Asistente de Avisos</h3>
      </div>

      {/* Chat Messages */}
      <div className="h-80 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-900 text-zinc-200 border border-zinc-850"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-zinc-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-purple-400" />
            </div>
            <div className="bg-zinc-900 text-zinc-200 border border-zinc-850 p-3 rounded-2xl">
              <Loader2 size={14} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
          disabled={loading}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-2xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
