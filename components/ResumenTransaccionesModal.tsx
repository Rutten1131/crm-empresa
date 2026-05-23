"use client";

import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Transaccion {
  id: string;
  tipo: "INGRESO" | "GASTO";
  monto: number;
  descripcion: string;
  fecha: Date | string;
  categoria: string;
}

interface ResumenTransaccionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transacciones: Transaccion[];
}

export default function ResumenTransaccionesModal({
  isOpen,
  onClose,
  title,
  transacciones,
}: ResumenTransaccionesModalProps) {
  if (!isOpen) return null;

  // Calcular totales de las transacciones pasadas
  const ingresos = transacciones
    .filter((t) => t.tipo === "INGRESO")
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const gastos = transacciones
    .filter((t) => t.tipo === "GASTO")
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const neto = ingresos - gastos;

  const formatFecha = (fechaInput: Date | string) => {
    const d = new Date(fechaInput);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-500">
              Se encontraron {transacciones.length} transacciones.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-xl hover:bg-zinc-800/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Totales del Modal */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Ingresos</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              +${ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Gastos</span>
            <span className="text-sm font-bold font-mono text-red-400">
              -${gastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase">Neto</span>
            <span className={`text-sm font-bold font-mono ${neto >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {neto >= 0 ? "+" : "-"}${Math.abs(neto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* List of Transactions */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {transacciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-zinc-800/40 flex items-center justify-center text-zinc-650">
                <DollarSign size={20} />
              </div>
              <p className="text-sm text-zinc-400 font-medium">No hay transacciones registradas</p>
              <p className="text-xs text-zinc-600">No se encontraron movimientos para esta selección.</p>
            </div>
          ) : (
            transacciones.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 bg-zinc-950/65 border border-zinc-850 hover:border-zinc-800 rounded-2xl transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    t.tipo === "INGRESO"
                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
                      : "bg-red-500/5 border-red-500/10 text-red-400"
                  }`}>
                    {t.tipo === "INGRESO" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-zinc-200 block max-w-[220px] md:max-w-[260px] truncate" title={t.descripcion}>
                      {t.descripcion}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">
                        {formatFecha(t.fecha)}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full font-medium">
                        {t.categoria || "General"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold font-mono ${
                    t.tipo === "INGRESO" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {t.tipo === "INGRESO" ? "+" : "-"}${Number(t.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Cerrar */}
        <div className="mt-6 pt-4 border-t border-zinc-800/40">
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-sm font-semibold rounded-2xl transition-all cursor-pointer active:scale-[0.98]"
          >
            Cerrar Resumen
          </button>
        </div>
      </div>
    </div>
  );
}
