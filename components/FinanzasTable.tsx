"use client";

import { Trash2 } from "lucide-react";
import type { Transaccion } from "@prisma/client";
import { TipoTransaccionEnum } from "./enums";

interface FinanzasTableProps {
  transacciones: (Omit<Transaccion, "monto"> & { monto: number })[];
  userRole: string;
  onDeleteSuccess: () => void;
  filtros: {
    tipo: string;
    categoria: string;
    desde: string;
    hasta: string;
  };
  setFiltros: React.Dispatch<
    React.SetStateAction<{
      tipo: string;
      categoria: string;
      desde: string;
      hasta: string;
    }>
  >;
}

const TODAS_CATEGORIAS = [
  "Ventas",
  "Suscripciones",
  "Consultoría",
  "Servicios",
  "Inversiones",
  "Marketing",
  "Herramientas/Software",
  "Sueldos",
  "Servicios Básicos",
  "Infraestructura",
  "Impuestos",
  "Otros",
];

export default function FinanzasTable({
  transacciones,
  userRole,
  onDeleteSuccess,
  filtros,
  setFiltros,
}: FinanzasTableProps) {
  const isAdmin = userRole === "ADMIN";

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta transacción?")) {
      return;
    }

    try {
      const response = await fetch(`/api/finanzas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo eliminar la transacción");
      }

      onDeleteSuccess();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const cleanFilters = () => {
    setFiltros({
      tipo: "",
      categoria: "",
      desde: "",
      hasta: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtros Bar */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300">Filtrar Movimientos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tipo</span>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros((prev) => ({ ...prev, tipo: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="">Todos</option>
              <option value={TipoTransaccionEnum.INGRESO}>Ingresos</option>
              <option value={TipoTransaccionEnum.GASTO}>Gastos</option>
            </select>
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Categoría</span>
            <select
              value={filtros.categoria}
              onChange={(e) => setFiltros((prev) => ({ ...prev, categoria: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="">Todas</option>
              {TODAS_CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Desde</span>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros((prev) => ({ ...prev, desde: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hasta</span>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros((prev) => ({ ...prev, hasta: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none transition-colors cursor-pointer"
            />
          </div>
        </div>

        {/* Clean Filter Button */}
        {(filtros.tipo || filtros.categoria || filtros.desde || filtros.hasta) && (
          <div className="flex justify-end">
            <button
              onClick={cleanFilters}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-3 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-850 cursor-pointer"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900/80 bg-zinc-900/20">
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">
                  Monto
                </th>
                {isAdmin && (
                  <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-16">
                    Acción
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/40">
              {transacciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="py-12 px-6 text-center text-sm text-zinc-500"
                  >
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transacciones.map((t) => {
                  const esIngreso = t.tipo === TipoTransaccionEnum.INGRESO;
                  const fechaFormateada = new Date(t.fecha).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-zinc-900/10 transition-colors group"
                    >
                      {/* Tipo */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            esIngreso
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {esIngreso ? "Ingreso" : "Gasto"}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="py-4 px-6 text-sm font-medium text-zinc-300">
                        {t.categoria}
                      </td>

                      {/* Descripción */}
                      <td className="py-4 px-6 text-sm text-zinc-400">
                        {t.descripcion}
                      </td>

                      {/* Fecha */}
                      <td className="py-4 px-6 text-sm text-zinc-500">
                        {fechaFormateada}
                      </td>

                      {/* Monto */}
                      <td className="py-4 px-6 text-right font-mono text-sm font-bold">
                        <span
                          className={esIngreso ? "text-emerald-400" : "text-red-400"}
                        >
                          {esIngreso ? "+" : "-"}
                          ${t.monto.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Delete Action (Admin only) */}
                      {isAdmin && (
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Eliminar Transacción"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
