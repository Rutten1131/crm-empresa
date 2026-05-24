"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ShieldAlert, MessageSquare, ExternalLink, Calendar, Users, UserPlus, AlertTriangle } from "lucide-react";
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

  // States for manual lead creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNombreNegocio, setNewNombreNegocio] = useState("");
  const [newTipoCliente, setNewTipoCliente] = useState("PAGINA_WEB");
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const handleCrearCliente = async (options?: { force?: boolean; reactivate?: boolean }) => {
    setModalLoading(true);
    setModalError(null);

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newNombre,
          telefono: newTelefono,
          email: newEmail,
          nombre_negocio: newNombreNegocio,
          tipoCliente: newTipoCliente,
          force: options?.force || false,
          reactivate: options?.reactivate || false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al procesar la solicitud");
      }

      const data = await res.json();

      if (data.duplicate) {
        setDuplicateInfo(data.existingCliente);
        setShowDuplicateModal(true);
        setShowCreateModal(false);
      } else {
        // Creado o reactivado con éxito
        setNewNombre("");
        setNewTelefono("");
        setNewEmail("");
        setNewNombreNegocio("");
        setDuplicateInfo(null);
        setShowCreateModal(false);
        setShowDuplicateModal(false);

        // Recargar lista de clientes
        const updatedClientes = await fetchClientes();
        
        // Abrir automáticamente el panel del cliente
        if (data.cliente) {
          const clientInList = updatedClientes?.find((c: any) => c.id === data.cliente.id);
          setSelectedCliente(clientInList || data.cliente);
        }
      }
    } catch (err: any) {
      setModalError(err.message || "Ocurrió un error inesperado");
    } finally {
      setModalLoading(false);
    }
  };

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
      {/* Title and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100 flex items-center gap-3">
            <Users size={28} className="text-zinc-400" />
            Administración de Clientes
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Historial de leads, embudo de conversión y estado de seguimientos automáticos.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setModalError(null);
          }}
          className="px-5 py-3 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-2xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow shrink-0"
        >
          <UserPlus size={16} />
          Nuevo Lead
        </button>
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
                  Lead
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Plan
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
                    <td colSpan={7} className="py-5 px-6">
                      <div className="h-5 bg-zinc-900 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-sm text-zinc-500">
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

                      {/* Plan */}
                      <td className="py-4 px-6">
                        {c.plan ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                            c.plan === "BASIC" ? "bg-zinc-800 text-zinc-300 border-zinc-700" :
                            c.plan === "BUSINESS" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                            "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          }`}>
                            {c.plan}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs font-semibold">-</span>
                        )}
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
                          <span className="text-zinc-600">cliente/Ninguno</span>
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
            if (foundInList) {
              setSelectedCliente(foundInList);
            }
          }
        }}
        onClienteDeleted={(clienteId) => {
          setClientes((prev) => prev.filter((c) => c.id !== clienteId));
          setSelectedCliente(null);
        }}
      />


      {/* Modal: Crear Lead */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowCreateModal(false)}
          />
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl z-10 animate-slide-in space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                <UserPlus className="text-zinc-400" size={20} />
                Registrar Nuevo Lead
              </h3>
              <p className="text-xs text-zinc-500">Completa los datos del lead para agregarlo a tu embudo.</p>
            </div>

            {modalError && (
              <div className="p-3 bg-red-500/10 text-red-400 text-xs font-semibold rounded-xl border border-red-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              handleCrearCliente();
            }} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nombre del Contacto *</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 outline-none transition-colors"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  placeholder="Ej: +521234567890"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 outline-none transition-colors font-mono"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Email (Opcional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ej: juan@empresa.com"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 outline-none transition-colors"
                />
              </div>

              {/* Nombre del Negocio */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nombre del Negocio (Opcional)</label>
                <input
                  type="text"
                  value={newNombreNegocio}
                  onChange={(e) => setNewNombreNegocio(e.target.value)}
                  placeholder="Ej: Taquería Los Primos"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 outline-none transition-colors"
                />
              </div>

              {/* Tipo de Cliente */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Cliente *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "PAGINA_WEB", label: "Página Web" },
                    { value: "CRM", label: "CRM" },
                    { value: "ACTIVAQ", label: "ActivaQR" },
                  ].map((tipo) => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => setNewTipoCliente(tipo.value)}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        newTipoCliente === tipo.value
                          ? "bg-zinc-100 text-zinc-950 border-zinc-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {modalLoading ? "Guardando..." : "Crear Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Advertencia de Duplicado */}
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDuplicateModal(false)}
          />
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-amber-500/20 rounded-3xl p-6 shadow-2xl z-10 space-y-6">
            
            {/* Header Alert */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                  Lead Duplicado Detectado
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ya existe un registro con el teléfono <span className="font-mono text-zinc-200 font-bold">{newTelefono}</span> en tu base de datos:
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Nombre registrado:</span>
                <span className="font-bold text-zinc-200">{duplicateInfo.nombre}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Estado actual:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase border ${
                  duplicateInfo.estado === EstadoCliente.PENDIENTE ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  duplicateInfo.estado === EstadoCliente.ENVIADO ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  duplicateInfo.estado === EstadoCliente.PAGADO ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                }`}>
                  {duplicateInfo.estado === EstadoCliente.PENDIENTE ? "Nuevo" :
                   duplicateInfo.estado === EstadoCliente.ENVIADO ? "Seguimiento" :
                   duplicateInfo.estado === EstadoCliente.PAGADO ? "Convertido" : "Cerrado"}
                </span>
              </div>
            </div>

            {/* Warning Message */}
            <p className="text-[11px] text-zinc-500 leading-normal text-center italic">
              ¿Qué acción deseas tomar con este lead?
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={modalLoading}
                onClick={() => handleCrearCliente({ reactivate: true })}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20"
              >
                Reactivar y Ver Lead Existente
              </button>

              <button
                type="button"
                disabled={modalLoading}
                onClick={() => handleCrearCliente({ force: true })}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-zinc-150 text-xs font-semibold rounded-2xl border border-zinc-750 transition-all cursor-pointer active:scale-[0.98]"
              >
                Crear como un Duplicado Nuevo
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setShowCreateModal(true);
                }}
                className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-400 text-xs font-semibold rounded-2xl border border-zinc-850 transition-all cursor-pointer"
              >
                Corregir Teléfono / Regresar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
