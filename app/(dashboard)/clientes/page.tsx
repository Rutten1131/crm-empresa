"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ShieldAlert, MessageSquare, ExternalLink, Calendar, Users } from "lucide-react";
import type { Cliente, Seguimiento } from "@prisma/client";
import { EstadoCliente, EstadoSeguimiento } from "./enums";
import ClientePanel from "@/components/ClientePanel";

type ClienteWithSeguimientos = Cliente & {
  seguimientos: Seguimiento[];
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteWithSeguimientos[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (estadoFiltro) params.append("estado", estadoFiltro);
      if (search) params.append("search", search);

      const response = await fetch(`/api/clientes?${params.toString()}`);
      if (!response.ok) throw new Error("Error al obtener clientes");
      const data = await response.json();
      setClientes(data);
      return data as ClienteWithSeguimientos[];
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, search]);

  useEffect(() => {
    // Debounce de búsqueda simple (300ms)
    const delayDebounceFn = setTimeout(() => {
      fetchClientes();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, estadoFiltro, fetchClientes]);

  // Encontrar el siguiente seguimiento pendiente
  const getProximoSeguimiento = (cliente: ClienteWithSeguimientos) => {
    const pendientes = cliente.seguimientos.filter(
      (s) => (s.estado as unknown as string) === EstadoSeguimiento.PENDIENTE
    );
    if (pendientes.length === 0) return null;
    return pendientes[0]; // Ya ordenados por fechaProg asc en la API
  };

  // Validar si el cliente está inactivo (creado hace > 14 días y sigue en PENDIENTE o ENVIADO)
  const esInactivo = (cliente: ClienteWithSeguimientos) => {
    if (
      cliente.estado !== EstadoCliente.PENDIENTE &&
      cliente.estado !== EstadoCliente.ENVIADO
    ) {
      return false;
    }
    const catorceDiasEnMs = 14 * 24 * 60 * 60 * 1000;
    const antiguedad = Date.now() - new Date(cliente.fechaIngreso).getTime();
    return antiguedad > catorceDiasEnMs;
  };

  // Helper para traducir estados
  const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case EstadoCliente.PENDIENTE:
      return { text: "Nuevo", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case EstadoCliente.ENVIADO:
      return { text: "Seguimiento", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case EstadoCliente.PAGADO:
      return { text: "Convertido", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case EstadoCliente.CERRADO:
      return { text: "Cerrado", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
    default:
      return { text: "Desconocido", style: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
  }
};;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100 flex items-center gap-3">
          <Users size={28} className="text-zinc-400" />
          Administración de Clientes
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Historial de leads, embudo de conversión y estado de seguimientos automáticos.
        </p>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Input Buscador */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          {/* Filtros de Estado */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { label: "Todos", value: "" },
              { label: "Nuevos", value: EstadoCliente.PENDIENTE },
              { label: "Seguimiento", value: EstadoCliente.ENVIADO },
              { label: "Convertidos", value: EstadoCliente.PAGADO },
              { label: "Cerrados", value: EstadoCliente.CERRADO },
            ].map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setEstadoFiltro(filtro.value)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  estadoFiltro === filtro.value
                    ? "bg-zinc-100 text-zinc-950 border border-zinc-150"
                    : "bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900/80 bg-zinc-900/20">
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Ingreso
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Próximo Seguimiento
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-28">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/40">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-5 px-6">
                      <div className="h-5 bg-zinc-900 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-sm text-zinc-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const badgeInfo = getEstadoBadge(c.estado);
                  const proxSeg = getProximoSeguimiento(c);
                  const inactivo = esInactivo(c);

                  const fechaIngresoFormatted = new Date(c.fechaIngreso).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-900/10 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCliente(c)}
                    >
                      {/* Cliente (Nombre + Alerta de Inactividad) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-zinc-200 group-hover:text-zinc-100 transition-colors">
                            {c.nombre}
                          </span>
                          {inactivo && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20"
                              title="Sin respuesta / Inactivo por más de 14 días"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ShieldAlert size={10} />
                              Inactivo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="py-4 px-6">
                        <a
                          href={c.telefono ? `https://wa.me/${c.telefono.replace('+', '')}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 transition-colors font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.telefono}
                          <ExternalLink size={10} />
                        </a>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${badgeInfo.style}`}>
                          {badgeInfo.text}
                        </span>
                      </td>

                      {/* Fecha de ingreso */}
                      <td className="py-4 px-6 text-xs text-zinc-500">
                        {fechaIngresoFormatted}
                      </td>

                      {/* Próximo seguimiento */}
                      <td className="py-4 px-6 text-xs font-medium">
                        {proxSeg ? (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Calendar size={12} className="text-zinc-500" />
                            <span>
                              {new Date(proxSeg.fechaProg).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                            <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-500">
                              Día {proxSeg.dia}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">Completado/Ninguno</span>
                        )}
                      </td>

                      {/* Detalles Button */}
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCliente(c)}
                          className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Panel */}
      <ClientePanel
        cliente={selectedCliente}
        onClose={() => setSelectedCliente(null)}
        onStatusChangeSuccess={async (updatedCliente) => {
          const updatedClientes = await fetchClientes();
          if (updatedCliente) {
            const foundInList = updatedClientes?.find((c) => c.id === updatedCliente.id);
            setSelectedCliente(foundInList || updatedCliente);
          }
        }}
      />
    </div>
  );
}
