"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import FinanzasChart from "@/components/FinanzasChart";
import FinanzasTable from "@/components/FinanzasTable";
import TransaccionModal from "@/components/TransaccionModal";
import FinanzasCalendar from "@/components/FinanzasCalendar";
import ResumenTransaccionesModal from "@/components/ResumenTransaccionesModal";

export default function FinanzasPage() {
  const { data: session } = useSession();
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [resumen, setResumen] = useState({ ingresos: 0, gastos: 0, neto: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedTransacciones, setSelectedTransacciones] = useState<any[]>([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const handleIngresosClick = () => {
    const hoy = new Date();
    const currentMonthTrans = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === hoy.getFullYear() &&
        tDate.getMonth() === hoy.getMonth() &&
        t.tipo === "INGRESO"
      );
    });
    if (currentMonthTrans.length === 0) return;
    const monthLabel = hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    setSelectedTitle(`Detalle de Ingresos - ${monthLabel}`);
    setSelectedTransacciones(currentMonthTrans);
    setIsSummaryModalOpen(true);
  };

  const handleGastosClick = () => {
    const hoy = new Date();
    const currentMonthTrans = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === hoy.getFullYear() &&
        tDate.getMonth() === hoy.getMonth() &&
        t.tipo === "GASTO"
      );
    });
    if (currentMonthTrans.length === 0) return;
    const monthLabel = hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    setSelectedTitle(`Detalle de Gastos - ${monthLabel}`);
    setSelectedTransacciones(currentMonthTrans);
    setIsSummaryModalOpen(true);
  };

  const handleNetoClick = () => {
    const hoy = new Date();
    const currentMonthTrans = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === hoy.getFullYear() && tDate.getMonth() === hoy.getMonth();
    });
    if (currentMonthTrans.length === 0) return;
    const monthLabel = hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    setSelectedTitle(`Movimientos del Mes - ${monthLabel}`);
    setSelectedTransacciones(currentMonthTrans);
    setIsSummaryModalOpen(true);
  };

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: "",
    categoria: "",
    desde: "",
    hasta: "",
  });

  const fetchFinanzas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.tipo) params.append("tipo", filtros.tipo);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.desde) params.append("desde", filtros.desde);
      if (filtros.hasta) params.append("hasta", filtros.hasta);

      const response = await fetch(`/api/finanzas?${params.toString()}`);
      if (!response.ok) throw new Error("No se pudieron cargar los datos financieros");
      
      const data = await response.json();
      setTransacciones(data.transacciones);
      setResumen(data.resumen);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchFinanzas();
  }, [fetchFinanzas]);

  const userRole = session?.user?.role || "AGENTE";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">
            Control de Finanzas
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Visualiza y administra todos los movimientos contables del mes.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <Plus size={16} />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Ingresos */}
        <div
          onClick={handleIngresosClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group transition-all duration-200 active:scale-[0.98] ${
            resumen.ingresos > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500 block">Total Ingresos (Mes)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                ${resumen.ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.03)]">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Card Gastos */}
        <div
          onClick={handleGastosClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group transition-all duration-200 active:scale-[0.98] ${
            resumen.gastos > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500 block">Total Gastos (Mes)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-red-400">
                ${resumen.gastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.03)]">
            <TrendingDown size={20} />
          </div>
        </div>

        {/* Card Neto */}
        <div
          onClick={handleNetoClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group transition-all duration-200 active:scale-[0.98] ${
            transacciones.length > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-500 block">Balance Neto (Mes)</span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl font-bold font-mono ${
                  resumen.neto >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {resumen.neto >= 0 ? "+" : "-"}
                ${Math.abs(resumen.neto).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm ${
              resumen.neto >= 0
                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.03)]"
                : "bg-red-500/5 border-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.03)]"
            }`}
          >
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Grid: Graph & Table */}
      <div className="space-y-8">
        {/* Calendar Component */}
        <FinanzasCalendar transacciones={transacciones} />

        {/* Graph Component */}
        <FinanzasChart transacciones={transacciones} />

        {/* Table Title */}
        <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">
            Historial de Transacciones
          </h2>
          {loading && <span className="text-xs text-zinc-500 animate-pulse">Actualizando...</span>}
        </div>

        {/* Table & Filters Component */}
        <FinanzasTable
          transacciones={transacciones}
          userRole={userRole}
          onDeleteSuccess={fetchFinanzas}
          filtros={filtros}
          setFiltros={setFiltros}
        />
      </div>

      {/* Modal dialog for creating transaction */}
      <TransaccionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchFinanzas}
      />

      {/* Modal de Resumen de Transacciones */}
      <ResumenTransaccionesModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title={selectedTitle}
        transacciones={selectedTransacciones}
      />
    </div>
  );
}
