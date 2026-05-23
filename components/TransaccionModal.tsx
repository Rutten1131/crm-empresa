"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
// Import type only to avoid runtime Prisma client import
import type { TipoTransaccion } from "@prisma/client";

// Local enum mirroring Prisma enum for client-side usage
export const TipoTransaccionEnum = {
  INGRESO: "INGRESO" as const,
  GASTO: "GASTO" as const,
};


interface TransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransaccionModal({ isOpen, onClose, onSuccess }: TransaccionModalProps) {
  const [tipo, setTipo] = useState<keyof typeof TipoTransaccionEnum>("INGRESO");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleTipoChange = (nuevoTipo: keyof typeof TipoTransaccionEnum) => {
    setTipo(nuevoTipo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/finanzas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo,
          monto: parseFloat(monto),
          descripcion,
          categoria: "GENERAL",
          fecha: new Date(fecha).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Algo salió mal");
      }

      onSuccess();
      // Reset form
      setMonto("");
      setDescripcion("");
      setFecha(new Date().toISOString().split("T")[0]);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Nueva Transacción
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-xl hover:bg-zinc-800/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Tipo Toggle Button Group */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-400">Tipo de Movimiento</span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800/60 rounded-2xl">
              <button
                type="button"
                onClick={() => handleTipoChange("INGRESO")}
                className={`py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  tipo === TipoTransaccionEnum.INGRESO
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("GASTO")}
                className={`py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  tipo === TipoTransaccionEnum.GASTO
                    ? "bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Gasto
              </button>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <label htmlFor="monto" className="text-xs font-semibold text-zinc-400">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-zinc-500">
                $
              </span>
              <input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-sm font-mono text-zinc-100 placeholder-zinc-700 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label htmlFor="descripcion" className="text-xs font-semibold text-zinc-400">
              Descripción
            </label>
            <input
              id="descripcion"
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Cobro cliente Aquatech"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors"
            />
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="text-xs font-semibold text-zinc-400">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-2xl text-sm text-zinc-200 outline-none transition-colors cursor-pointer"
            />
          </div>

          {/* Footer / Action buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-zinc-850 hover:border-zinc-800 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 text-sm font-semibold rounded-2xl transition-all cursor-pointer active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-sm font-bold rounded-2xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
