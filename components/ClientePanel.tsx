"use client";

import { useEffect, useState } from "react";
import { X, Calendar, MessageSquare, ShieldAlert, CheckCircle2, User, Phone, Mail, Clock } from "lucide-react";
import { Cliente, Seguimiento, EstadoCliente, EstadoSeguimiento } from "@prisma/client";

interface ClientePanelProps {
  cliente: Cliente | null;
  onClose: () => void;
  onStatusChangeSuccess: () => void;
}

export default function ClientePanel({ cliente, onClose, onStatusChangeSuccess }: ClientePanelProps) {
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loadingSeguimientos, setLoadingSeguimientos] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (cliente) {
      fetchSeguimientos();
    }
  }, [cliente]);

  const fetchSeguimientos = async () => {
    if (!cliente) return;
    try {
      setLoadingSeguimientos(true);
      const response = await fetch(`/api/clientes/${cliente.id}/seguimientos`);
      if (!response.ok) throw new Error("Error al obtener seguimientos");
      const data = await response.json();
      setSeguimientos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSeguimientos(false);
    }
  };

  if (!cliente) return null;

  const handleStatusChange = async (nuevoEstado: EstadoCliente) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!response.ok) throw new Error("Error al actualizar estado");
      
      onStatusChangeSuccess();
      // Recargar seguimientos ya que al pasar a PAGADO/CERRADO se omiten los pendientes
      fetchSeguimientos();
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper para traducir estados del cliente
  const getEstadoBadge = (estado: EstadoCliente) => {
    switch (estado) {
      case EstadoCliente.PENDIENTE:
        return { text: "Nuevo", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case EstadoCliente.ENVIADO:
        return { text: "Seguimiento", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case EstadoCliente.PAGADO:
        return { text: "Convertido", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case EstadoCliente.CERRADO:
        return { text: "Cerrado", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
    }
  };

  const badge = getEstadoBadge(cliente.estado);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel container */}
      <div className="relative w-full max-w-lg h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col z-10 animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${badge.style}`}>
              {badge.text}
            </span>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">{cliente.nombre}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-2 rounded-xl hover:bg-zinc-800/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {/* Datos del Cliente */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Datos de Contacto</h3>
            <div className="space-y-3 bg-zinc-950 border border-zinc-850 p-4 rounded-2xl">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Phone size={16} className="text-zinc-500" />
                {cliente.telefono ? (
                  <a href={`https://wa.me/${cliente.telefono.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 hover:underline font-mono">
                    {cliente.telefono}
                  </a>
                ) : (
                  <span className="text-zinc-500">Sin teléfono</span>
                )}
              </div>
              {cliente.email && (
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Mail size={16} className="text-zinc-500" />
                  <span>{cliente.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Calendar size={16} className="text-zinc-500" />
                <span>
                  Ingreso:{" "}
                  {new Date(cliente.fechaIngreso).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Cambiar Estado */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actualizar Estado Manual</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(EstadoCliente) as EstadoCliente[]).map((est) => {
                const badgeInfo = getEstadoBadge(est);
                const activo = cliente.estado === est;
                return (
                  <button
                    key={est}
                    disabled={updatingStatus || activo}
                    onClick={() => handleStatusChange(est)}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 ${
                      activo
                        ? `${badgeInfo.style} border-zinc-700 bg-zinc-800/40 cursor-default`
                        : "border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                    }`}
                  >
                    {activo && <CheckCircle2 size={12} className="shrink-0" />}
                    {badgeInfo.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historial de Seguimientos */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Historial de Seguimientos</h3>
            
            {loadingSeguimientos ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-full bg-zinc-950 border border-zinc-900 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : seguimientos.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No hay seguimientos agendados para este cliente.</p>
            ) : (
              <div className="space-y-3">
                {seguimientos.map((seg) => {
                  let statusColor = "bg-zinc-800 text-zinc-500 border-zinc-850";
                  let statusText = "Pendiente";

                  if (seg.estado === EstadoSeguimiento.ENVIADO) {
                    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    statusText = "Enviado";
                  } else if (seg.estado === EstadoSeguimiento.OMITIDO) {
                    statusColor = "bg-zinc-900 text-zinc-600 border-zinc-850 line-through";
                    statusText = "Omitido";
                  }

                  const fechaProgFormatted = new Date(seg.fechaProg).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={seg.id}
                      className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 space-y-3 transition-colors hover:border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">
                          Día {seg.dia}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>Programado: {fechaProgFormatted}</span>
                        </div>
                        {seg.fechaEnvio && (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span>
                              Enviado el:{" "}
                              {new Date(seg.fechaEnvio).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {seg.mensaje && (
                        <div className="p-3 bg-zinc-900 border border-zinc-850/50 rounded-xl text-xs text-zinc-400 italic font-medium leading-relaxed">
                          {seg.mensaje}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
