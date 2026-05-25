"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";

interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  telefono: string;
  fechaProg: string;
  estado: string;
  clienteId?: string;
  cliente?: {
    nombre: string;
  };
}

interface AvisosCalendarProps {
  avisos: Aviso[];
  onDateClick: (date: Date) => void;
}

export default function AvisosCalendar({ avisos, onDateClick }: AvisosCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

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

  const getLocalDateStringFromDateObject = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEcuadorHour = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const guayaquilStr = d.toLocaleString("en-US", {
      timeZone: "America/Guayaquil",
      hour: "numeric",
      hour12: false,
    });
    return Number(guayaquilStr);
  };

  const getAvisosForDate = (date: Date) => {
    const dateStr = getLocalDateStringFromDateObject(date);
    return avisos.filter(aviso => {
      const avisoDate = getEcuadorLocalDateString(aviso.fechaProg);
      return avisoDate === dateStr;
    });
  };

  const hasAvisosOnDate = (date: Date) => {
    return getAvisosForDate(date).length > 0;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick(date);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasAvisos = hasAvisosOnDate(date);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          className={`
            h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer relative
            ${isSelected 
              ? "bg-zinc-100 text-zinc-950" 
              : isToday 
                ? "bg-zinc-800 text-zinc-200 border border-zinc-700" 
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }
          `}
        >
          {day}
          {hasAvisos && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
              <div className="w-1 h-1 bg-emerald-400 rounded-full" />
            </div>
          )}
        </button>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-semibold text-zinc-200">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDate) return null;

    const avisosDelDia = getAvisosForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Clock size={14} className="text-zinc-400" />
            Horarios del {selectedDate.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
          </h4>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {hours.map(hour => {
            const avisosEnHora = avisosDelDia.filter(aviso => {
              const avisoHour = getEcuadorHour(aviso.fechaProg);
              return avisoHour === hour;
            });

            return (
              <div
                key={hour}
                className={`
                  p-2 rounded-lg text-xs flex items-center gap-2 transition-all
                  ${avisosEnHora.length > 0 
                    ? "bg-zinc-800 border border-zinc-700" 
                    : "bg-zinc-900/50 border border-zinc-850/30"
                  }
                `}
              >
                <span className="w-12 text-zinc-500 font-mono">
                  {hour.toString().padStart(2, '0')}:00
                </span>
                {avisosEnHora.length > 0 ? (
                  <div className="flex-1 space-y-1">
                    {avisosEnHora.map(aviso => (
                      <div key={aviso.id} className="text-zinc-200">
                        {aviso.titulo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-600">-</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon size={18} className="text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Calendario de Avisos</h3>
      </div>
      {renderCalendar()}
      {renderTimeSlots()}
    </div>
  );
}
