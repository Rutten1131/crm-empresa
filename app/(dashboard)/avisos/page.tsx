"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Send, Clock, Trash2, Calendar, Phone, Bell, Loader2 } from "lucide-react";
import { EstadoAviso } from "@/lib/estadoAviso";
import AvisosCalendar from "@/components/AvisosCalendar";
import AvisosChat from "@/components/AvisosChat";

export default function AvisosPage() {
  const { data: session } = useSession();
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estado del Filtro
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [asesorSeleccionado, setAsesorSeleccionado] = useState<string>("");
  
  // Estado del Calendario
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Estado para aviso expandido
  const [avisoExpandido, setAvisoExpandido] = useState<string | null>(null);

  // Campos del Formulario
  const [titulo, setTitulo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fechaProg, setFechaProg] = useState("");

  // Determinar asesor automáticamente basado en el nombre del usuario
  useEffect(() => {
    if (session?.user?.name) {
      const nombre = session.user.name.toLowerCase();
      if (nombre.includes("cesar") || nombre.includes("césar")) {
        setAsesorSeleccionado("Cesar");
      } else if (nombre.includes("cristhopher") || nombre.includes("cristopher")) {
        setAsesorSeleccionado("Cristhopher");
      }
    }
  }, [session]);

  const fetchAvisos = useCallback(async () => {
    try {
      setLoading(true);
      const url = asesorSeleccionado ? `/api/avisos?asesor=${asesorSeleccionado}` : "/api/avisos";
      const response = await fetch(url);
      if (!response.ok) throw new Error("No se pudieron cargar los avisos");
      const data = await response.json();
      setAvisos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [asesorSeleccionado]);

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

      // Mostrar mensaje de conflicto si existe
      if (data.mensajeConflicto) {
        setError(data.mensajeConflicto);
      } else {
        setSuccess("Aviso programado correctamente");
        // Reset form
        setTitulo("");
        setTelefono("");
        setMensaje("");
        setFechaProg("");
      }
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

  const getEcuadorLocalDateString = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const guayaquilStr = d.toLocaleString("en-US", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [month, day, year] = guayaquilStr.split("/");
    return `${year}-${month}-${day}`;
  };

  // Filtrar avisos por fecha seleccionada
  const avisosPorFecha = selectedDate
    ? avisos.filter((a) => {
        const avisoDate = getEcuadorLocalDateString(a.fechaProg);
        const selectedDateStr = getEcuadorLocalDateString(selectedDate);
        return avisoDate === selectedDateStr;
      })
    : avisos;

  // Obtener avisos de hoy
  const avisosHoy = avisos.filter((a) => {
    const avisoDate = getEcuadorLocalDateString(a.fechaProg);
    const today = getEcuadorLocalDateString(new Date());
    return avisoDate === today;
  });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
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
        {/* Calendario - Más grande */}
        <div className="lg:col-span-2">
          <AvisosCalendar avisos={avisos} onDateClick={handleDateClick} asesor={asesorSeleccionado} />
        </div>

        {/* Avisos de Hoy */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-zinc-400" />
              Avisos de Hoy
            </h3>
            {avisosHoy.length === 0 ? (
              <p className="text-xs text-zinc-500">No hay avisos para hoy</p>
            ) : (
              <div className="space-y-3">
                {avisosHoy.slice(0, 3).map((a) => {
                  const badge = getAvisoBadge(a.estado);
                  return (
                    <div key={a.id} className="p-3 bg-zinc-900/40 border border-zinc-850/50 rounded-2xl">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-zinc-200 truncate">{a.titulo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.style}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {new Date(a.fechaProg).toLocaleTimeString("es-EC", {
                          timeZone: "America/Guayaquil",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </p>
                    </div>
                  );
                })}
                {avisosHoy.length > 3 && (
                  <p className="text-xs text-zinc-500 text-center">
                    +{avisosHoy.length - 3} más avisos
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listado de Avisos - Cuadritos Pequeños */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-200">
            {selectedDate 
              ? `Avisos para ${selectedDate.toLocaleDateString("es-EC", {
                  timeZone: "America/Guayaquil",
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })}`
              : "Todos los Avisos"
            }
          </h3>
          <span className="text-xs text-zinc-500">
            {avisosPorFecha.length} avisos
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-24 w-full bg-zinc-950 border border-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : avisosPorFecha.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-12 text-center text-zinc-500 text-sm">
            No hay avisos en este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {avisosPorFecha.map((a) => {
              const badge = getAvisoBadge(a.estado);
              const fechaProgFormatted = new Date(a.fechaProg).toLocaleDateString("es-EC", {
                timeZone: "America/Guayaquil",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
              });
              const isExpandido = avisoExpandido === a.id;

              return (
                <div
                  key={a.id}
                  onClick={() => setAvisoExpandido(isExpandido ? null : a.id)}
                  className={`bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3 transition-all cursor-pointer hover:border-zinc-800 group relative ${
                    isExpandido ? "col-span-2 md:col-span-3 lg:col-span-4" : ""
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-zinc-200 truncate">{a.titulo}</h3>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        {new Date(a.fechaProg).toLocaleTimeString("es-EC", {
                          timeZone: "America/Guayaquil",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${badge.style}`}>
                        {badge.text}
                      </span>

                      {a.estado === EstadoAviso.PENDIENTE && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(a.id);
                          }}
                          className="p-1.5 text-zinc-650 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                          title="Cancelar Aviso"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Información expandida */}
                  {isExpandido && (
                    <div className="space-y-3 pt-3 border-t border-zinc-850">
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

                      {/* Mensaje */}
                      <div className="p-3 bg-zinc-900/40 border border-zinc-850/50 rounded-xl text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                        {a.mensaje}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
