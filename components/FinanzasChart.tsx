"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Transaccion } from "@prisma/client";
import { TipoTransaccionEnum } from "./enums";

interface FinanzasChartProps {
  transacciones: (Omit<Transaccion, "monto"> & { monto: number })[];
}

export default function FinanzasChart({ transacciones }: FinanzasChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[350px] w-full bg-zinc-900/10 border border-zinc-900 rounded-3xl animate-pulse flex items-center justify-center">
        <span className="text-zinc-600 text-sm font-medium">Cargando gráfica...</span>
      </div>
    );
  }

  // Obtener días del mes actual para rellenar la gráfica secuencialmente
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const numDias = new Date(anio, mes + 1, 0).getDate();

  // Inicializar arreglo de días
  const datosPorDia: { [key: number]: { dia: string; Ingresos: number; Gastos: number } } = {};
  for (let d = 1; d <= numDias; d++) {
    datosPorDia[d] = {
      dia: `${d}`,
      Ingresos: 0,
      Gastos: 0,
    };
  }

  // Llenar datos con transacciones reales del mes actual
  transacciones.forEach((t) => {
    const fechaT = new Date(t.fecha);
    if (fechaT.getFullYear() === anio && fechaT.getMonth() === mes) {
      const dia = fechaT.getDate();
      if (datosPorDia[dia]) {
        const monto = Number(t.monto);
        if (t.tipo === TipoTransaccionEnum.INGRESO) {
          datosPorDia[dia].Ingresos += monto;
        } else if (t.tipo === TipoTransaccionEnum.GASTO) {
          datosPorDia[dia].Gastos += monto;
        }
      }
    }
  });

  const chartData = Object.values(datosPorDia);

  // Formateador de moneda simplificado para el eje Y
  const formatYAxis = (value: number) => {
    if (value === 0) return "$0";
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  // Tooltip personalizado con estética premium dark
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 border border-zinc-900 p-4 rounded-2xl shadow-xl backdrop-blur-md">
          <p className="text-xs text-zinc-500 font-semibold mb-2">Día {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm mb-1 last:mb-0">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-zinc-100">
                ${entry.value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">
            Actividad Financiera Diaria
          </h2>
          <p className="text-xs text-zinc-500">
            Comparativa de ingresos y gastos acumulados en el mes en curso.
          </p>
        </div>
      </div>

      <div className="h-[350px] w-full relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barGap={4}
          >
            <defs>
              <linearGradient id="ingresoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#18181b"
            />
            <XAxis
              dataKey="dia"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#18181b", opacity: 0.4 }} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-zinc-400 font-medium px-1">{value}</span>
              )}
            />
            <Bar
              name="Ingresos"
              dataKey="Ingresos"
              fill="url(#ingresoGrad)"
              radius={[6, 6, 0, 0]}
              maxBarSize={16}
            />
            <Bar
              name="Gastos"
              dataKey="Gastos"
              fill="url(#gastoGrad)"
              radius={[6, 6, 0, 0]}
              maxBarSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
