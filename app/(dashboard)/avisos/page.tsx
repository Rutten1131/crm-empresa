"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Send, Clock, Trash2, Calendar, Phone, Bell, Loader2 } from "lucide-react";
import { EstadoAviso } from "@/lib/estadoAviso";

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estado del Filtro
  const [filtroEstado, setFiltroEstado] = useState<string>("");

  // Campos del Formulario
  const [titulo, setTitulo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fechaProg, setFechaProg] = useState("");

  const fetchAvisos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/avisos");
      if (!response.ok) throw new Error("No se pudieron cargar los avisos");
      const data = await response.json();
      setAvisos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvisos();
  }, [fetchAvisos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/avisos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo,
          telefono,
          mensaje,
          fechaProg,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al programar el aviso");
      }

      setSuccess("Aviso programado correctamente");
      // Reset form
      setTitulo("");
      setTelefono("");
      setMensaje("");
      setFechaProg("");
      fetchAvisos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar/cancelar este aviso programado?")) {
      return;
    }

    try {
      const response = await fetch(`/api/avisos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo eliminar el aviso");
      }

      fetchAvisos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtrar avisos en el cliente
  const avisosFiltrados = avisos.filter((a) => {
    if (!filtroEstado) return true;
    return a.estado === filtroEstado;
  });

  const getAvisoBadge = (estado: EstadoAviso) => {
    switch (estado) {
      case EstadoAviso.PENDIENTE:
        return { text: "Pendiente", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case EstadoAviso.ENVIADO:
        return { text: "Enviado", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case EstadoAviso.FALLIDO:
        return { text: "Fallido", style: "bg-red-500/10 text-red-400 border-red-500/20" };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100 flex items-center gap-3">
          <Bell size={28} className="text-zinc-400" />
          Avisos Programados
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Agenda recordatorios, alertas manuales y mensajes personalizados para enviar vía WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Creación */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 lg:p-8 space-y-6 h-fit">
          <div>
            <h2 className="text-base font-semibold text-zinc-200 tracking-tight">Programar Nuevo Aviso</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Rellena los datos para agendar el envío de WhatsApp.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium animate-fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 font-medium animate-fade-in">
                {success}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="titulo" className="text-xs font-semibold text-zinc-400">
                Título del Aviso
              </label>
              <input
                id="titulo"
                type="text"
                required
                placeholder="Ej. Recordatorio de reunión"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label htmlFor="telefono" className="text-xs font-semibold text-zinc-400">
                Teléfono de Destino (WhatsApp)
              </label>
              <input
                id="telefono"
                type="tel"
                required
                placeholder="Ej. +52 1 55 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors font-mono"
              />
            </div>

            {/* Fecha Programada */}
            <div className="space-y-1.5">
              <label htmlFor="fechaProg" className="text-xs font-semibold text-zinc-400">
                Fecha y Hora de Envío
              </label>
              <input
                id="fechaProg"
                type="datetime-local"
                required
                value={fechaProg}
                onChange={(e) => setFechaProg(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
              />
            </div>

            {/* Mensaje */}
            <div className="space-y-1.5">
              <label htmlFor="mensaje" className="text-xs font-semibold text-zinc-400">
                Mensaje
              </label>
              <textarea
                id="mensaje"
                required
                rows={4}
                placeholder="Escribe el mensaje aquí..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-2xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  Programar Aviso
                </>
              )}
            </button>
          </form>
        </div>

        {/* Listado de Avisos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filtros */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4 flex flex-wrap gap-2">
            {[
              { label: "Todos", value: "" },
              { label: "Pendientes", value: EstadoAviso.PENDIENTE },
              { label: "Enviados", value: EstadoAviso.ENVIADO },
              { label: "Fallidos", value: EstadoAviso.FALLIDO },
            ].map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setFiltroEstado(filtro.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filtroEstado === filtro.value
                    ? "bg-zinc-100 text-zinc-950"
                    : "bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>

          {/* Listado */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 w-full bg-zinc-950 border border-zinc-900 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : avisosFiltrados.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-12 text-center text-zinc-500 text-sm">
              No hay avisos agendados en este filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {avisosFiltrados.map((a) => {
                const badge = getAvisoBadge(a.estado);
                const fechaProgFormatted = new Date(a.fechaProg).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={a.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 md:p-6 space-y-4 transition-all hover:border-zinc-800 group relative"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-zinc-200">{a.titulo}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {a.telefono}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {fechaProgFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.style}`}>
                          {badge.text}
                        </span>

                        {a.estado === EstadoAviso.PENDIENTE && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-2 text-zinc-650 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Cancelar Aviso"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div className="p-3 bg-zinc-900/40 border border-zinc-850/50 rounded-2xl text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {a.mensaje}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
