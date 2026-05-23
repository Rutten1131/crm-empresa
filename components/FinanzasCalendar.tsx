"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import ResumenTransaccionesModal from "./ResumenTransaccionesModal";

interface Transaccion {
  id: string;
  tipo: "INGRESO" | "GASTO";
  monto: number;
  descripcion: string;
  fecha: Date | string;
  categoria: string;
}

interface FinanzasCalendarProps {
  transacciones: Transaccion[];
}

interface DayData {
  date: Date;
  ingresos: number;
  gastos: number;
  neto: number;
  transacciones: Transaccion[];
}

export default function FinanzasCalendar({ transacciones }: FinanzasCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedTransacciones, setSelectedTransacciones] = useState<Transaccion[]>([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Handlers for opening the summary modal
  const handleDayClick = (day: DayData) => {
    if (day.transacciones.length === 0) return;
    const formattedDate = day.date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setSelectedTitle(`Transacciones del ${formattedDate}`);
    setSelectedTransacciones(day.transacciones as any);
    setIsSummaryModalOpen(true);
  };

  const handleIngresosMesClick = () => {
    const year = currentDate.getFullYear();
    const monthLabel = monthNames[currentDate.getMonth()];
    // Filtrar ingresos del mes actual
    const monthlyIngresos = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === currentDate.getFullYear() &&
        tDate.getMonth() === currentDate.getMonth() &&
        t.tipo === "INGRESO"
      );
    });
    if (monthlyIngresos.length === 0) return;
    setSelectedTitle(`Ingresos de ${monthLabel} ${year}`);
    setSelectedTransacciones(monthlyIngresos as any);
    setIsSummaryModalOpen(true);
  };

  const handleGastosMesClick = () => {
    const year = currentDate.getFullYear();
    const monthLabel = monthNames[currentDate.getMonth()];
    // Filtrar gastos del mes actual
    const monthlyGastos = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === currentDate.getFullYear() &&
        tDate.getMonth() === currentDate.getMonth() &&
        t.tipo === "GASTO"
      );
    });
    if (monthlyGastos.length === 0) return;
    setSelectedTitle(`Gastos de ${monthLabel} ${year}`);
    setSelectedTransacciones(monthlyGastos as any);
    setIsSummaryModalOpen(true);
  };

  const handleBalanceMesClick = () => {
    const year = currentDate.getFullYear();
    const monthLabel = monthNames[currentDate.getMonth()];
    // Filtrar todas las transacciones del mes actual
    const monthlyTransacciones = transacciones.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === currentDate.getFullYear() &&
        tDate.getMonth() === currentDate.getMonth()
      );
    });
    if (monthlyTransacciones.length === 0) return;
    setSelectedTitle(`Movimientos de ${monthLabel} ${year}`);
    setSelectedTransacciones(monthlyTransacciones as any);
    setIsSummaryModalOpen(true);
  };

  const handleMaxGastosClick = () => {
    if (!monthSummary.maxGastosDay || monthSummary.maxGastosDay.transacciones.length === 0) return;
    handleDayClick(monthSummary.maxGastosDay);
  };

  // Agrupar transacciones por día
  const daysData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransacciones = transacciones.filter(t => {
        const tDate = new Date(t.fecha).toISOString().split('T')[0];
        return tDate === dateStr;
      });

      const ingresos = dayTransacciones
        .filter(t => t.tipo === "INGRESO")
        .reduce((sum, t) => sum + Number(t.monto), 0);
      
      const gastos = dayTransacciones
        .filter(t => t.tipo === "GASTO")
        .reduce((sum, t) => sum + Number(t.monto), 0);

      days.push({
        date,
        ingresos,
        gastos,
        neto: ingresos - gastos,
        transacciones: dayTransacciones,
      });
    }

    return days;
  }, [transacciones, currentDate]);

  // Resumen del mes
  const monthSummary = useMemo(() => {
    const ingresos = daysData.reduce((sum, day) => sum + day.ingresos, 0);
    const gastos = daysData.reduce((sum, day) => sum + day.gastos, 0);
    const neto = ingresos - gastos;
    
    // Encontrar día con más gastos
    const maxGastosDay = daysData.reduce((max, day) => 
      day.gastos > max.gastos ? day : max, daysData[0]);

    return { ingresos, gastos, neto, maxGastosDay };
  }, [daysData]);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDayColor = (day: DayData) => {
    if (day.transacciones.length === 0) return "bg-zinc-900/50";
    if (day.neto > 0) return "bg-emerald-500/20 border-emerald-500/30";
    if (day.neto < 0) return "bg-red-500/20 border-red-500/30";
    return "bg-zinc-800/50";
  };

  return (
    <div className="space-y-6">
      {/* Resumen del mes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={handleIngresosMesClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/25 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] ${
            monthSummary.ingresos > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
            <TrendingUp size={14} />
            <span>Ingresos del mes</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            ${monthSummary.ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div
          onClick={handleGastosMesClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/25 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] ${
            monthSummary.gastos > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
            <TrendingDown size={14} />
            <span>Gastos del mes</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            ${monthSummary.gastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div
          onClick={handleBalanceMesClick}
          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/25 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] ${
            transacciones.length > 0 ? "cursor-pointer" : "opacity-80"
          }`}
        >
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
            <DollarSign size={14} />
            <span>Balance neto</span>
          </div>
          <p className={`text-2xl font-bold ${monthSummary.neto >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {monthSummary.neto >= 0 ? "+" : "-"}${Math.abs(monthSummary.neto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Día con más gastos */}
      {monthSummary.maxGastosDay && monthSummary.maxGastosDay.gastos > 0 && (
        <div
          onClick={handleMaxGastosClick}
          className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/25 rounded-2xl p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
        >
          <p className="text-xs text-zinc-400 mb-2">Día con más gastos</p>
          <p className="text-sm font-semibold text-zinc-200">
            {dayNames[monthSummary.maxGastosDay.date.getDay()]} {monthSummary.maxGastosDay.date.getDate()} de {monthNames[monthSummary.maxGastosDay.date.getMonth()]}
            <span className="ml-2 text-red-400">
              - ${monthSummary.maxGastosDay.gastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      )}

      {/* Calendario */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} className="text-zinc-400" />
          </button>
          <h3 className="text-lg font-semibold text-zinc-100">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-zinc-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-2">
          {/* Espacios vacíos para alinear el primer día */}
          {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Días del mes */}
          {daysData.map((day) => (
            <div
              key={day.date.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-xl border p-2 hover:scale-105 transition-transform select-none ${
                day.transacciones.length > 0
                  ? "cursor-pointer"
                  : "cursor-default opacity-60"
              } ${getDayColor(day)}`}
              title={`${day.ingresos > 0 ? `Ingresos: $${day.ingresos}` : ''} ${day.gastos > 0 ? `Gastos: $${day.gastos}` : ''}`}
            >
              <div className="text-xs font-semibold text-zinc-200 mb-1">
                {day.date.getDate()}
              </div>
              {day.transacciones.length > 0 && (
                <div className="space-y-1">
                  {day.ingresos > 0 && (
                    <div className="text-[9px] text-emerald-400 font-mono">
                      +${day.ingresos}
                    </div>
                  )}
                  {day.gastos > 0 && (
                    <div className="text-[9px] text-red-400 font-mono">
                      -${day.gastos}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
