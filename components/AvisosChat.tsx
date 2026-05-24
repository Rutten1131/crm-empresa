"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import MicrophoneButton from "./MicrophoneButton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AvisosChatProps {
  onAvisoCreado: () => void;
  asesor?: string;
}

export default function AvisosChat({ onAvisoCreado, asesor }: AvisosChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes históricos al montar el componente
  useEffect(() => {
    if (asesor) {
      loadMessages();
    }
  }, [asesor]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Comentado para no hacer scroll automático al final
  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat-messages?asesor=${asesor}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error al cargar mensajes:", error);
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    try {
      await fetch("/api/chat-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, asesor }),
      });
    } catch (error) {
      console.error("Error al guardar mensaje:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    await saveMessage("user", userMessage);

    try {
      const response = await fetch("/api/deepseek/chat-avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, asesor }),
      });

      if (!response.ok) throw new Error("Error al procesar el mensaje");

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      await saveMessage("assistant", data.response);
      
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
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            disabled={loading}
            className="w-full px-4 py-3 pr-12 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <MicrophoneButton
              onTranscript={(text) => setInput(prev => prev + (prev ? " " : "") + text)}
              disabled={loading}
            />
          </div>
        </div>
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
