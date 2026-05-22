"use client";

import { useEffect, useState } from "react";
import {
  X, Phone, Mail, Calendar, CheckCircle2, Clock,
  Send, ThumbsUp, ThumbsDown, RefreshCw, DollarSign,
  MessageSquare, Presentation, FileText, CreditCard
} from "lucide-react";
import type { Cliente, Seguimiento } from "@prisma/client";
import { EstadoClienteEnum, DemoReseñaEnum, MetodoPagoEnum } from "./enums";

interface ClientePanelProps {
  cliente: Cliente | null;
  onClose: () => void;
  onStatusChangeSuccess: (updatedCliente?: any) => void;
}

export default function ClientePanel({ cliente, onClose, onStatusChangeSuccess }: ClientePanelProps) {
  const [loading, setLoading] = useState(false);

  // Paso 2 state
  const [nota, setNota] = useState("");
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);

  // Paso 3 state
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagoEnum>(MetodoPagoEnum.TRANSFERENCIA);
  const [notaPago, setNotaPago] = useState("");
  const [tipoCierre, setTipoCierre] = useState<"pago" | "nota">("pago");
  const [agregarGasto, setAgregarGasto] = useState(false);
  const [montoGasto, setMontoGasto] = useState("");
  const [descripcionGasto, setDescripcionGasto] = useState("");

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    // Reset states when client changes
    setNota("");
    setEnviarWhatsapp(false);
    setMonto("");
    setMetodo(MetodoPagoEnum.TRANSFERENCIA);
    setNotaPago("");
    setTipoCierre("pago");
    setAgregarGasto(false);
    setMontoGasto("");
    setDescripcionGasto("");
    setFeedback(null);
  }, [cliente?.id]);


  if (!cliente) return null;

  // ── Determinar el paso actual ──
  const getPasoActual = (): number => {
    if (!cliente.demoPresentada) return 1;
    if (!cliente.demoReseña || cliente.demoReseña === DemoReseñaEnum.VOLVER_A_PRESENTAR) return 2;
    if (cliente.demoReseña === DemoReseñaEnum.NO_INTERESADO) return -1; // Cerrado
    if (!cliente.compraRealizada) return 3;
    return 4; // Completado
  };

  const pasoActual = getPasoActual();

  // ── Handlers ──
  const handleMarcarDemo = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marcar_demo" }),
      });
      if (!res.ok) throw new Error("Error al marcar demo");
      const updatedData = await res.json();
      setFeedback({ type: "success", msg: "✅ Demo presentada correctamente" });
      onStatusChangeSuccess(updatedData);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al marcar demo" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarInteres = async (resultado: DemoReseñaEnum) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registrar_interes",
          resultado,
          nota,
          enviarWhatsappMsg: enviarWhatsapp,
        }),
      });
      if (!res.ok) throw new Error("Error al registrar interés");

      const data = await res.json();
      let msg = resultado === DemoReseñaEnum.NO_INTERESADO
        ? "Cliente marcado como no interesado"
        : resultado === DemoReseñaEnum.VOLVER_A_PRESENTAR
          ? "Se marcó para volver a presentar"
          : "✅ Cliente interesado registrado";

      if (data.whatsappEnviado) {
        msg += " — WhatsApp enviado ✅";
      } else if (data.whatsappError) {
        msg += ` — WhatsApp falló: ${data.whatsappError}`;
      }

      setFeedback({ type: "success", msg });
      setNota("");
      onStatusChangeSuccess(data);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al registrar interés" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      setFeedback({ type: "error", msg: "Ingresa un monto de venta válido" });
      return;
    }

    if (agregarGasto) {
      if (!montoGasto || parseFloat(montoGasto) <= 0) {
        setFeedback({ type: "error", msg: "Ingresa un monto de gasto válido" });
        return;
      }
      if (parseFloat(montoGasto) > parseFloat(monto)) {
        setFeedback({ type: "error", msg: "El gasto asociado no puede ser mayor que el monto de la venta" });
        return;
      }
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registrar_pago",
          monto,
          metodo,
          notas: notaPago,
          registrarGasto: agregarGasto,
          montoGasto: agregarGasto ? montoGasto : undefined,
          descripcionGasto: agregarGasto ? descripcionGasto : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar pago");
      }

      const responseData = await res.json();
      let msg = "✅ Pago registrado y conectado a finanzas";
      if (agregarGasto) {
        msg += " + Gasto registrado ✅";
      }

      setFeedback({ type: "success", msg });
      setMonto("");
      setNotaPago("");
      setAgregarGasto(false);
      setMontoGasto("");
      setDescripcionGasto("");
      onStatusChangeSuccess(responseData.cliente);
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Error al registrar pago" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarNotaCierre = async () => {
    if (!notaPago || !notaPago.trim()) {
      setFeedback({ type: "error", msg: "Por favor escribe una nota de cierre" });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registrar_nota_cierre",
          notas: notaPago,
        }),
      });

      if (!res.ok) throw new Error("Error al registrar nota de cierre");
      const updatedData = await res.json();

      setFeedback({ type: "success", msg: "✅ Nota de cierre registrada correctamente" });
      setNotaPago("");
      onStatusChangeSuccess(updatedData);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al registrar nota de cierre" });
    } finally {
      setLoading(false);
    }
  };


  // ── UI Helpers ──
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case EstadoClienteEnum.PENDIENTE:
        return { text: "Nuevo", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case EstadoClienteEnum.ENVIADO:
        return { text: "Seguimiento", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case EstadoClienteEnum.PAGADO:
        return { text: "Convertido", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case EstadoClienteEnum.CERRADO:
        return { text: "Cerrado", style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
      default:
        return { text: "Desconocido", style: "bg-gray-500/10 text-gray-400" };
    }
  };

  const badge = getEstadoBadge(cliente.estado as string);

  // ── Step indicator ──
  const steps = [
    { num: 1, label: "Demo", icon: Presentation },
    { num: 2, label: "Interés", icon: MessageSquare },
    { num: 3, label: "Pago", icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
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
            className="text-zinc-500 hover:text-zinc-300 p-2 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

          {/* Datos de Contacto */}
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

          {/* ══════ Pipeline de 3 Pasos ══════ */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pipeline de Seguimiento</h3>

            {/* Step Indicator */}
            <div className="flex items-center gap-0 bg-zinc-950 border border-zinc-850 rounded-2xl p-4">
              {steps.map((step, idx) => {
                const isCompleted = pasoActual > step.num || pasoActual === 4;
                const isCurrent = pasoActual === step.num;
                const isClosed = pasoActual === -1;
                const Icon = step.icon;

                return (
                  <div key={step.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : isCurrent
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse"
                            : isClosed
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-zinc-900 border-zinc-800 text-zinc-600"
                      }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider ${
                        isCompleted ? "text-emerald-400" : isCurrent ? "text-blue-400" : "text-zinc-600"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`h-[2px] flex-1 mx-1 rounded-full transition-all -mt-4 ${
                        isCompleted ? "bg-emerald-500/30" : "bg-zinc-800"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-semibold border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {feedback.msg}
            </div>
          )}

          {/* ══════ PASO 1: Entrega de Demo ══════ */}
          {pasoActual === 1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Paso 1 — Entrega de Demo
              </h3>
              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Al presionar este botón confirmas que le presentaste la demo/página al cliente.
                  El estado pasará a <span className="text-amber-400 font-semibold">"Seguimiento"</span>.
                </p>
                <button
                  onClick={handleMarcarDemo}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Presentation size={16} />
                  {loading ? "Procesando..." : "Demo Presentada ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ══════ PASO 2: Interés + Nota ══════ */}
          {pasoActual === 2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Paso 2 — Resultado del seguimiento
              </h3>
              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-5">

                {/* Nota */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">Nota / Resumen de la conversación</label>
                  <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="¿Qué se habló? ¿Cuándo volver a presentar? Observaciones..."
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none"
                  />
                </div>

                {/* Toggle WhatsApp */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
                    enviarWhatsapp ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                    onClick={() => setEnviarWhatsapp(!enviarWhatsapp)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      enviarWhatsapp ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Enviar nota por WhatsApp al cliente
                  </span>
                </label>

                {/* Botones de acción */}
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleRegistrarInteres(DemoReseñaEnum.INTERESADO)}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <ThumbsUp size={16} />
                    {loading ? "Procesando..." : "Interesado — Pasar a Pago"}
                  </button>

                  <button
                    onClick={() => handleRegistrarInteres(DemoReseñaEnum.VOLVER_A_PRESENTAR)}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-amber-400 text-sm font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 border border-zinc-750"
                  >
                    <RefreshCw size={14} />
                    Volver a Presentar
                  </button>

                  <button
                    onClick={() => handleRegistrarInteres(DemoReseñaEnum.NO_INTERESADO)}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-red-950/40 disabled:opacity-50 text-red-400 text-sm font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 border border-zinc-850 hover:border-red-900/40"
                  >
                    <ThumbsDown size={14} />
                    No le Interesa — Cerrar
                  </button>
                </div>
              </div>

              {/* Nota previa si existe (volver a presentar) */}
              {cliente.notaReseña && (
                <div className="bg-zinc-950 border border-amber-500/10 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Nota anterior</span>
                  <p className="text-sm text-zinc-400 italic leading-relaxed">{cliente.notaReseña}</p>
                  {cliente.fechaReseña && (
                    <span className="text-[10px] text-zinc-600">
                      {new Date(cliente.fechaReseña).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════ PASO 3: Pago o Nota ══════ */}
          {pasoActual === 3 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Paso 3 — Cierre de Lead
              </h3>
              
              {/* Premium Selector Tabs */}
              <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTipoCierre("pago");
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tipoCierre === "pago"
                      ? "bg-zinc-900 text-zinc-150 border border-zinc-800 shadow"
                      : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  <CreditCard size={14} />
                  Registrar Pago
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoCierre("nota");
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tipoCierre === "nota"
                      ? "bg-zinc-900 text-zinc-150 border border-zinc-800 shadow"
                      : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  <FileText size={14} />
                  Solo Registrar Nota
                </button>
              </div>

              {/* Form Content */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-5">
                
                {tipoCierre === "pago" ? (
                  <>
                    {/* Monto de venta */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400">Monto de Venta ($)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400">Método de Pago</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: MetodoPagoEnum.TRANSFERENCIA, label: "Transferencia" },
                          { value: MetodoPagoEnum.EFECTIVO, label: "Efectivo" },
                          { value: MetodoPagoEnum.TARJETA, label: "Tarjeta" },
                        ]).map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setMetodo(m.value)}
                            className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              metodo === m.value
                                ? "bg-zinc-100 text-zinc-950 border-zinc-200"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nota del pago */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400">Nota del Pago (opcional)</label>
                      <input
                        type="text"
                        value={notaPago}
                        onChange={(e) => setNotaPago(e.target.value)}
                        placeholder="Ej: Activación plan Business"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    {/* ──── GASTO ASOCIADO (OPCIONAL) ──── */}
                    <div className="pt-2 border-t border-zinc-900/60 space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <input
                          type="checkbox"
                          checked={agregarGasto}
                          onChange={(e) => {
                            setAgregarGasto(e.target.checked);
                            if (!e.target.checked) {
                              setMontoGasto("");
                              setDescripcionGasto("");
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-zinc-450 group-hover:text-zinc-300 transition-colors">
                          ¿Registrar un gasto asociado a este lead? (hosting, comisión, etc.)
                        </span>
                      </label>

                      {agregarGasto && (
                        <div className="space-y-4 bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl">
                          {/* Monto del Gasto */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400">Monto del Gasto ($)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={montoGasto}
                                onChange={(e) => setMontoGasto(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors font-mono"
                              />
                            </div>
                            {montoGasto && monto && parseFloat(montoGasto) > parseFloat(monto) && (
                              <p className="text-[10px] font-semibold text-red-400 mt-1 animate-pulse">
                                ⚠️ El gasto asociado no puede ser mayor que el monto de la venta (${parseFloat(monto).toFixed(2)})
                              </p>
                            )}
                          </div>

                          {/* Descripción del Gasto */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400">Descripción del Gasto</label>
                            <input
                              type="text"
                              value={descripcionGasto}
                              onChange={(e) => setDescripcionGasto(e.target.value)}
                              placeholder="Ej: Registro dominio activaqr.com, comisión Cesar"
                              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botón Pago */}
                    <button
                      onClick={handleRegistrarPago}
                      disabled={
                        loading || 
                        !monto || 
                        (agregarGasto && (!montoGasto || parseFloat(montoGasto) <= 0 || parseFloat(montoGasto) > parseFloat(monto)))
                      }
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <DollarSign size={16} />
                      {loading ? "Procesando..." : "Registrar Pago y Finalizar"}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Solo registrar nota */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400">Nota de Cierre / Conclusión</label>
                      <textarea
                        value={notaPago}
                        onChange={(e) => setNotaPago(e.target.value)}
                        placeholder="Escribe los detalles o notas finales por las cuales se concluye este lead..."
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none"
                      />
                    </div>

                    {/* Botón Nota */}
                    <button
                      onClick={handleRegistrarNotaCierre}
                      disabled={loading || !notaPago || !notaPago.trim()}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      {loading ? "Procesando..." : "Registrar Nota y Finalizar"}
                    </button>
                  </>
                )}

                <p className="text-[10px] text-zinc-600 text-center">
                  {tipoCierre === "pago"
                    ? "El pago y el gasto opcional se registrarán directamente en el módulo de Finanzas."
                    : "Esta nota se guardará en el historial y marcará el lead como concluido sin movimientos financieros."}
                </p>
              </div>
            </div>
          )}


          {/* ══════ ESTADO FINAL: Completado ══════ */}
          {pasoActual === 4 && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-emerald-400">Cliente Convertido</h3>
              {cliente.montoTotal && (
                <p className="text-2xl font-bold text-zinc-100">${Number(cliente.montoTotal).toFixed(2)}</p>
              )}
              {cliente.fechaCompra && (
                <p className="text-xs text-zinc-500">
                  Pagado el{" "}
                  {new Date(cliente.fechaCompra).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* ══════ ESTADO FINAL: Cerrado ══════ */}
          {pasoActual === -1 && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 text-center space-y-3">
              <ThumbsDown size={36} className="text-red-400 mx-auto" />
              <h3 className="text-lg font-bold text-red-400">No Interesado</h3>
              {cliente.notaReseña && (
                <p className="text-sm text-zinc-400 italic">{cliente.notaReseña}</p>
              )}
              {cliente.fechaReseña && (
                <p className="text-xs text-zinc-500">
                  Cerrado el{" "}
                  {new Date(cliente.fechaReseña).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Historial resumen */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Historial</h3>
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl divide-y divide-zinc-850">
              {/* Demo */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Presentation size={14} className={cliente.demoPresentada ? "text-emerald-400" : "text-zinc-600"} />
                  <span className={`text-xs font-semibold ${cliente.demoPresentada ? "text-zinc-300" : "text-zinc-600"}`}>
                    Demo presentada
                  </span>
                </div>
                {cliente.fechaDemo && (
                  <span className="text-[10px] text-zinc-500">
                    {new Date(cliente.fechaDemo).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
              {/* Interés */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare size={14} className={cliente.demoReseña ? "text-emerald-400" : "text-zinc-600"} />
                  <span className={`text-xs font-semibold ${cliente.demoReseña ? "text-zinc-300" : "text-zinc-600"}`}>
                    {cliente.demoReseña === DemoReseñaEnum.INTERESADO
                      ? "Interesado"
                      : cliente.demoReseña === DemoReseñaEnum.NO_INTERESADO
                        ? "No interesado"
                        : cliente.demoReseña === DemoReseñaEnum.VOLVER_A_PRESENTAR
                          ? "Volver a presentar"
                          : "Resultado pendiente"}
                  </span>
                </div>
                {cliente.fechaReseña && (
                  <span className="text-[10px] text-zinc-500">
                    {new Date(cliente.fechaReseña).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
              {/* Pago */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard size={14} className={cliente.compraRealizada ? "text-emerald-400" : "text-zinc-600"} />
                  <span className={`text-xs font-semibold ${cliente.compraRealizada ? "text-zinc-300" : "text-zinc-600"}`}>
                    {cliente.compraRealizada
                      ? `Pagado — $${Number(cliente.montoTotal || 0).toFixed(2)}`
                      : "Pago pendiente"}
                  </span>
                </div>
                {cliente.fechaCompra && (
                  <span className="text-[10px] text-zinc-500">
                    {new Date(cliente.fechaCompra).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
