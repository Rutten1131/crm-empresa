"use client";

import { useEffect, useState } from "react";
import {
  X, Phone, Mail, Calendar, CheckCircle2, Clock,
  Send, ThumbsUp, ThumbsDown, RefreshCw, DollarSign,
  MessageSquare, Presentation, FileText, CreditCard, Trash2, AlertTriangle, Brain, Bot, User
} from "lucide-react";
import type { Cliente, Seguimiento } from "@prisma/client";
import { EstadoClienteEnum, DemoReseñaEnum, MetodoPagoEnum } from "./enums";
import MicrophoneButton from "./MicrophoneButton";

interface ClientePanelProps {
  cliente: Cliente | null;
  onClose: () => void;
  onStatusChangeSuccess: (updatedCliente?: any) => void;
  onClienteDeleted?: (clienteId: string) => void;
}

export default function ClientePanel({ cliente, onClose, onStatusChangeSuccess, onClienteDeleted }: ClientePanelProps) {
  const [loading, setLoading] = useState(false);

  // Paso 2 state
  const [resultadoPaso2, setResultadoPaso2] = useState<DemoReseñaEnum | null>(null);
  const [nota, setNota] = useState("");
  const [registrarAbonoInicial, setRegistrarAbonoInicial] = useState(false);
  const [valorProducto, setValorProducto] = useState("");
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<MetodoPagoEnum>(MetodoPagoEnum.TRANSFERENCIA);

  // Paso 3 state
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagoEnum>(MetodoPagoEnum.TRANSFERENCIA);
  const [notaPago, setNotaPago] = useState("");
  const [tipoCierre, setTipoCierre] = useState<"pago" | "nota">("pago");

  // Historial de pagos
  const [pagosList, setPagosList] = useState<any[]>([]);
  
  // Historial de seguimientos/notas
  const [seguimientosList, setSeguimientosList] = useState<any[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingBorrarNotas, setLoadingBorrarNotas] = useState(false);

  // Additional notes for completed clients
  const [notaAdicional, setNotaAdicional] = useState("");
  const [loadingNotaAdicional, setLoadingNotaAdicional] = useState(false);

  // CRM initial notes (Paso 1 para CRM)
  const [notasInicialesCRM, setNotasInicialesCRM] = useState("");
  const [loadingNotasIniciales, setLoadingNotasIniciales] = useState(false);
  
  // DeepSeek analysis
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [botResponse, setBotResponse] = useState<string>("");
  const [showChat, setShowChat] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchPagos = async () => {
    if (!cliente?.id) return;
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/pagos`);
      if (res.ok) {
        const data = await res.json();
        setPagosList(data);
      }
    } catch (err) {
      console.error("Error al cargar pagos:", err);
    }
  };

  const fetchSeguimientos = async () => {
    if (!cliente?.id) return;
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/seguimientos`);
      if (res.ok) {
        const data = await res.json();
        setSeguimientosList(data);
      }
    } catch (err) {
      console.error("Error al cargar seguimientos:", err);
    }
  };

  useEffect(() => {
    // Reset states when client changes
    setResultadoPaso2(null);
    setNota("");
    setRegistrarAbonoInicial(false);
    // Pre-llenar el valor del producto si ya está guardado en el cliente
    setValorProducto(cliente?.montoTotal ? cliente.montoTotal.toString() : "");
    setMontoAbono("");
    setMetodoPagoAbono(MetodoPagoEnum.TRANSFERENCIA);
    setMonto("");
    setMetodo(MetodoPagoEnum.TRANSFERENCIA);
    setNotaPago("");
    setTipoCierre("pago");
    setFeedback(null);

    if (cliente?.id) {
      fetchPagos();
      fetchSeguimientos();
    } else {
      setPagosList([]);
      setSeguimientosList([]);
    }
  }, [cliente?.id]);



  if (!cliente) return null;

  // ── Determinar el paso actual ──
  const getPasoActual = (): number => {
    // @ts-ignore
    const esCRM = (cliente as any).tipoCliente === "CRM";

    if (esCRM) {
      // Flujo CRM: Paso 1 (Notas iniciales) -> Paso 2 (Demo) -> Paso 3 (Interés)
      // @ts-ignore
      if (!(cliente as any).notasInicialesCRM) return 1;
      if (!cliente.demoPresentada) return 2;
      if (!cliente.demoReseña || cliente.demoReseña === DemoReseñaEnum.VOLVER_A_PRESENTAR) return 3;
      if (cliente.demoReseña === DemoReseñaEnum.NO_INTERESADO) return -1; // Cerrado
      if (!cliente.compraRealizada) return 4;
      return 5; // cliente
    } else {
      // Flujo normal: Paso 1 (Demo) -> Paso 2 (Interés) -> Paso 3 (Pago)
      if (!cliente.demoPresentada) return 1;
      if (!cliente.demoReseña || cliente.demoReseña === DemoReseñaEnum.VOLVER_A_PRESENTAR) return 2;
      if (cliente.demoReseña === DemoReseñaEnum.NO_INTERESADO) return -1; // Cerrado
      if (!cliente.compraRealizada) return 3;
      return 4; // cliente
    }
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
    const hasAbono = (resultado === DemoReseñaEnum.INTERESADO || resultado === DemoReseñaEnum.VOLVER_A_PRESENTAR) && montoAbono && parseFloat(montoAbono) > 0;

    if (resultado === DemoReseñaEnum.INTERESADO || resultado === DemoReseñaEnum.VOLVER_A_PRESENTAR) {
      if (hasAbono) {
        if (!valorProducto || parseFloat(valorProducto) <= 0) {
          setFeedback({ type: "error", msg: "Ingresa un valor de producto válido" });
          return;
        }
        if (parseFloat(montoAbono) > parseFloat(valorProducto)) {
          setFeedback({ type: "error", msg: "El abono no puede superar el valor del producto" });
          return;
        }
      }
    }

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
          valorProducto: (resultado === DemoReseñaEnum.INTERESADO || resultado === DemoReseñaEnum.VOLVER_A_PRESENTAR) && valorProducto ? valorProducto : undefined,
          montoAbono: hasAbono ? montoAbono : undefined,
          metodoPago: hasAbono ? metodoPagoAbono : undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar interés");
      }

      const data = await res.json();
      let msg = resultado === DemoReseñaEnum.NO_INTERESADO
        ? "Cliente marcado como no interesado"
        : resultado === DemoReseñaEnum.VOLVER_A_PRESENTAR
          ? "Se marcó para volver a presentar"
          : "✅ Cliente interesado registrado";

      // Si el bot tiene una respuesta, agregarla al mensaje
      if (data.botResponse) {
        msg = `${msg}\n\n🤖 Bot: ${data.botResponse}`;
      }

      setFeedback({ type: "success", msg });
      setNota("");
      setResultadoPaso2(null);
      setValorProducto("");
      setMontoAbono("");
      fetchPagos(); // Recargar pagos locales
      onStatusChangeSuccess(data);
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Error al registrar interés" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPago = async () => {
    const totalAbonado = pagosList.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalEsperado = cliente.montoTotal ? parseFloat(cliente.montoTotal.toString()) : 0;
    const saldoPendiente = totalEsperado > 0 ? Math.max(0, totalEsperado - totalAbonado) : Infinity;

    if (!monto || parseFloat(monto) <= 0) {
      setFeedback({ type: "error", msg: "Ingresa un monto de pago válido" });
      return;
    }

    if (totalEsperado > 0 && parseFloat(monto) > saldoPendiente) {
      setFeedback({ 
        type: "error", 
        msg: `El pago no puede superar el saldo pendiente de $${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` 
      });
      return;
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
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar pago");
      }

      const responseData = await res.json();
      let msg = "✅ Pago registrado y conectado a finanzas";

      setFeedback({ type: "success", msg });
      setMonto("");
      setNotaPago("");
      fetchPagos(); // Recargar pagos locales
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

      let msg = "✅ Nota de cierre registrada correctamente";
      // Si el bot tiene una respuesta, agregarla al mensaje
      if (updatedData.botResponse) {
        msg = `${msg}\n\n🤖 Bot: ${updatedData.botResponse}`;
      }

      setFeedback({ type: "success", msg });
      setNotaPago("");
      onStatusChangeSuccess(updatedData);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al registrar nota de cierre" });
    } finally {
      setLoading(false);
    }
  };

  const handleNotaChange = (value: string) => {
    setNota(value);
  };

  const handleAnalyzeNota = async () => {
    if (!nota.trim() || !cliente?.id) return;
    setLoadingAnalysis(true);
    try {
      const res = await fetch("/api/deepseek/analyze-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id, nota: nota }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis && data.analysis.response) {
          setBotResponse(data.analysis.response);
          setShowChat(true);
          // Guardar la conversación
          setConversation(prev => [
            ...prev,
            { role: "user", content: nota },
            { role: "assistant", content: data.analysis.response }
          ]);
        }
      }
    } catch (err) {
      console.error("Error al analizar nota:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleAnalyzeNotas = async () => {
    if (!cliente?.id) return;
    setLoadingAnalysis(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/deepseek/analyze-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id }),
      });

      if (!res.ok) throw new Error("Error al analizar notas");
      const data = await res.json();

      setAnalysisResult(data);
      setFeedback({ 
        type: "success", 
        msg: `✅ Análisis completado: ${data.avisosCreados} avisos creados, ${data.tareasExtraidas} tareas extraídas` 
      });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Error al analizar notas" });
    } finally {
      setLoadingAnalysis(false);
    }
  };


  const handleDeleteCliente = async () => {
    if (!cliente?.id) return;
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar cliente");
      setShowDeleteConfirm(false);
      if (onClienteDeleted) onClienteDeleted(cliente.id);
      onClose();
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al eliminar el cliente. Intenta de nuevo." });
      setShowDeleteConfirm(false);
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleBorrarNotas = async () => {
    if (!cliente?.id) return;
    setLoadingBorrarNotas(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "borrar_notas" }),
      });
      if (!res.ok) throw new Error("Error al borrar notas");
      const updated = await res.json();
      setFeedback({ type: "success", msg: "✅ Notas eliminadas correctamente" });
      onStatusChangeSuccess(updated);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al borrar notas" });
    } finally {
      setLoadingBorrarNotas(false);
    }
  };

  const handleAgregarNotaAdicional = async () => {
    if (!cliente?.id || !notaAdicional.trim()) return;
    setLoadingNotaAdicional(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "agregar_nota_adicional",
          nota: notaAdicional,
        }),
      });
      if (!res.ok) throw new Error("Error al agregar nota adicional");
      const updated = await res.json();

      let msg = "✅ Nota agregada correctamente";
      // Si el bot tiene una respuesta, agregarla al mensaje
      if (updated.botResponse) {
        msg = `${msg}\n\n🤖 Bot: ${updated.botResponse}`;
      }

      setFeedback({ type: "success", msg });
      setNotaAdicional("");
      onStatusChangeSuccess(updated);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al agregar nota adicional" });
    } finally {
      setLoadingNotaAdicional(false);
    }
  };

  const handleGuardarNotasInicialesCRM = async () => {
    if (!cliente?.id || !notasInicialesCRM.trim()) return;
    setLoadingNotasIniciales(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "guardar_notas_iniciales_crm",
          notas: notasInicialesCRM,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar notas iniciales");
      const updated = await res.json();

      let msg = "✅ Notas iniciales guardadas correctamente";
      // Si el bot tiene una respuesta, agregarla al mensaje
      if (updated.botResponse) {
        msg = `${msg}\n\n🤖 Bot: ${updated.botResponse}`;
      }

      setFeedback({ type: "success", msg });
      setNotasInicialesCRM("");
      onStatusChangeSuccess(updated);
    } catch (err) {
      setFeedback({ type: "error", msg: "Error al guardar notas iniciales" });
    } finally {
      setLoadingNotasIniciales(false);
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
      <div className="relative w-full md:max-w-lg h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col z-10 animate-slide-in">

        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${badge.style}`}>
              {badge.text}
            </span>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">{cliente.nombre}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAnalyzeNotas}
              disabled={loadingAnalysis}
              title="Analizar notas con IA"
              className="text-zinc-600 hover:text-purple-400 p-2 rounded-xl hover:bg-purple-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingAnalysis ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Eliminar cliente"
              className="text-zinc-600 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-2 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
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

          {/* ══════ PASO 1: Notas Iniciales (CRM) o Demo (Normal) ══════ */}
          {pasoActual === 1 && (
            <div className="space-y-4">
              {/* @ts-ignore */}
              {(cliente as any).tipoCliente === "CRM" ? (
                <>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Paso 1 — Notas Iniciales del Lead
                  </h3>
                  <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Agrega las notas iniciales sobre este posible cliente antes de presentar la demo.
                    </p>
                    <div className="relative">
                      <textarea
                        value={notasInicialesCRM}
                        onChange={(e) => setNotasInicialesCRM(e.target.value)}
                        placeholder="Ej: Cliente interesado en sistema CRM, tiene 20 empleados, busca automatización de ventas..."
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-650 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none"
                      />
                      <div className="absolute bottom-3 right-3">
                        <MicrophoneButton
                          onTranscript={(text) => setNotasInicialesCRM(prev => prev + (prev ? " " : "") + text)}
                          disabled={loadingNotasIniciales}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleGuardarNotasInicialesCRM}
                      disabled={loadingNotasIniciales || !notasInicialesCRM.trim()}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      {loadingNotasIniciales ? "Guardando..." : "Guardar Notas y Continuar"}
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* ══════ PASO 2: Interés + Nota ══════ */}
          {pasoActual === 2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Paso 2 — Resultado del seguimiento</span>
                {resultadoPaso2 && (
                  <button
                    onClick={() => {
                      setResultadoPaso2(null);
                      setFeedback(null);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                  >
                    ← Cambiar
                  </button>
                )}
              </h3>

              {!resultadoPaso2 ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">Selecciona el resultado de la demo presentada:</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Tarjeta 1: Le Interesa */}
                    <button
                      type="button"
                      onClick={() => setResultadoPaso2(DemoReseñaEnum.INTERESADO)}
                      className="w-full text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-emerald-500/30 p-4 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                        <ThumbsUp size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="block text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">Le Interesa</span>
                        <span className="block text-xs text-zinc-500">Proceder a definir el precio del producto y registrar un abono inicial (opcional).</span>
                      </div>
                    </button>

                    {/* Tarjeta 2: Volver a Presentar */}
                    <button
                      type="button"
                      onClick={() => setResultadoPaso2(DemoReseñaEnum.VOLVER_A_PRESENTAR)}
                      className="w-full text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-amber-500/30 p-4 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                        <RefreshCw size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="block text-sm font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Volver a Presentar</span>
                        <span className="block text-xs text-zinc-500">El lead sigue interesado pero requiere otra presentación o seguimiento posterior.</span>
                      </div>
                    </button>

                    {/* Tarjeta 3: No le Interesa */}
                    <button
                      type="button"
                      onClick={() => setResultadoPaso2(DemoReseñaEnum.NO_INTERESADO)}
                      className="w-full text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-red-500/30 p-4 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                        <ThumbsDown size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="block text-sm font-bold text-zinc-200 group-hover:text-red-400 transition-colors">No le Interesa</span>
                        <span className="block text-xs text-zinc-500">Cerrar el lead de manera definitiva.</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-5 animate-fade-in">
                  {/* outcome Header Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-900/60">
                    <span className="text-xs text-zinc-500">Resultado seleccionado:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      resultadoPaso2 === DemoReseñaEnum.INTERESADO
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {resultadoPaso2 === DemoReseñaEnum.INTERESADO && <ThumbsUp size={12} />}
                      {resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR && <RefreshCw size={12} />}
                      {resultadoPaso2 === DemoReseñaEnum.NO_INTERESADO && <ThumbsDown size={12} />}
                      {resultadoPaso2 === DemoReseñaEnum.INTERESADO ? "Le Interesa" : resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR ? "Volver a Presentar" : "No le Interesa"}
                    </span>
                  </div>

                  {(resultadoPaso2 === DemoReseñaEnum.INTERESADO || resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR) && (
                    <div className="space-y-4">
                      {/* PRECIO DEL PRODUCTO */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                          <span>Valor total del producto a vender ($)</span>
                          {cliente.montoTotal ? (
                            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                              ✓ Guardado
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">Obligatorio</span>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorProducto}
                            onChange={(e) => {
                              setValorProducto(e.target.value);
                              if (montoAbono && parseFloat(montoAbono) > parseFloat(e.target.value || "0")) {
                                setMontoAbono("");
                              }
                            }}
                            placeholder="0.00"
                            className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm outline-none transition-colors font-mono ${
                              cliente.montoTotal
                                ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300 focus:border-emerald-500/40"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 focus:border-zinc-650 text-zinc-100"
                            } placeholder-zinc-650`}
                          />
                        </div>
                        {cliente.montoTotal && (
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Precio registrado previamente. Puedes modificarlo si cambió.
                          </p>
                        )}
                      </div>


                      {/* ABONO INICIAL (Habilitado solo si se colocó precio) */}
                      {(() => {
                        const isAbonoDisabled = !valorProducto || parseFloat(valorProducto) <= 0;
                        return (
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold flex items-center justify-between ${isAbonoDisabled ? "text-zinc-600" : "text-zinc-400"}`}>
                              <span>Monto del abono inicial ($)</span>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">Opcional</span>
                            </label>
                            <div className="relative">
                              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm ${isAbonoDisabled ? "text-zinc-700" : "text-zinc-500"}`}>$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={isAbonoDisabled}
                                value={montoAbono}
                                onChange={(e) => setMontoAbono(e.target.value)}
                                placeholder={isAbonoDisabled ? "Ingresa el precio primero" : "0.00"}
                                className={`w-full pl-8 pr-4 py-3 border rounded-xl text-sm outline-none transition-colors font-mono ${
                                  isAbonoDisabled
                                    ? "bg-zinc-900/30 border-zinc-850/50 text-zinc-600 placeholder-zinc-700 cursor-not-allowed"
                                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 focus:border-zinc-650 text-zinc-100 placeholder-zinc-600"
                                }`}
                              />
                            </div>
                            
                            {/* Mensajes informativos y de validación reactivos */}
                            {isAbonoDisabled ? (
                              <p className="text-[10px] text-amber-500/80 font-medium">
                                ⚠️ Ingresa el valor del producto antes de colocar un abono.
                              </p>
                            ) : montoAbono && parseFloat(montoAbono) > parseFloat(valorProducto) ? (
                              <p className="text-[10px] text-red-400 font-bold animate-pulse">
                                ❌ El abono (${parseFloat(montoAbono).toFixed(2)}) no puede ser mayor que el valor del producto (${parseFloat(valorProducto).toFixed(2)}).
                              </p>
                            ) : montoAbono && parseFloat(montoAbono) > 0 ? (
                              <p className="text-[10px] text-emerald-400 font-bold">
                                ✅ Abono inicial válido. Se registrará en finanzas y el lead se convertirá en cliente.
                              </p>
                            ) : (
                              <p className="text-[10px] text-zinc-550 font-medium">
                                Deja vacío si solo quieres guardar que le interesa pero sin recibir dinero aún.
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* MÉTODO DE PAGO (Solo si hay abono inicial válido) */}
                      {montoAbono && parseFloat(montoAbono) > 0 && valorProducto && parseFloat(montoAbono) <= parseFloat(valorProducto) && (
                        <div className="space-y-2 animate-fade-in pt-1">
                          <label className="text-xs font-semibold text-zinc-400">Método de pago del abono</label>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { value: MetodoPagoEnum.TRANSFERENCIA, label: "Transferencia" },
                              { value: MetodoPagoEnum.EFECTIVO, label: "Efectivo" },
                              { value: MetodoPagoEnum.TARJETA, label: "Tarjeta" },
                            ]).map((m) => (
                              <button
                                key={m.value}
                                type="button"
                                onClick={() => setMetodoPagoAbono(m.value)}
                                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  metodoPagoAbono === m.value
                                    ? "bg-zinc-150 text-zinc-950 border-zinc-200"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-450 hover:text-zinc-200 hover:border-zinc-750"
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* NOTA DE CONVERSACIÓN (Para cualquier tipo de resultado) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400">
                      {resultadoPaso2 === DemoReseñaEnum.NO_INTERESADO ? "Razón del cierre (opcional)" : "Nota / Resumen de la conversación (opcional)"}
                    </label>
                    <div className="relative">
                      <textarea
                        value={nota}
                        onChange={(e) => handleNotaChange(e.target.value)}
                        placeholder={
                          resultadoPaso2 === DemoReseñaEnum.INTERESADO
                            ? "Ej: Le encantó el catálogo móvil, solicita instalarlo hoy mismo..."
                            : resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR
                              ? "Ej: El gerente no estuvo presente, agendamos para el jueves..."
                              : "Ej: Indica que ya tiene un sistema similar contratado..."
                        }
                        rows={3}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-650 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-200 placeholder-zinc-650 outline-none transition-colors resize-none"
                      />
                      <div className="absolute bottom-3 right-3">
                        <MicrophoneButton
                          onTranscript={(text) => setNota(prev => prev + (prev ? " " : "") + text)}
                          disabled={loading}
                        />
                      </div>
                      {/* Chat interactivo del bot */}
                      {showChat && conversation.length > 0 && (
                        <div className="mt-2 bg-zinc-950 border border-zinc-850 rounded-xl p-3 animate-fade-in max-h-60 overflow-y-auto">
                          {conversation.map((msg, idx) => (
                            <div key={idx} className={`flex items-start gap-2 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${
                                msg.role === "user" 
                                  ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}>
                                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                              </div>
                              <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                                <p className={`text-xs leading-relaxed ${
                                  msg.role === "user" 
                                    ? "bg-zinc-800 text-zinc-200 rounded-xl px-3 py-2" 
                                    : "text-zinc-300"
                                }`}>{msg.content}</p>
                              </div>
                            </div>
                          ))}
                          {loadingAnalysis && (
                            <div className="flex items-center gap-2 text-zinc-500">
                              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                              <span className="text-[10px]">Analizando...</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Botón para analizar nota */}
                      {nota.trim() && (
                        <button
                          type="button"
                          onClick={handleAnalyzeNota}
                          disabled={loadingAnalysis}
                          className="mt-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {loadingAnalysis ? "Analizando..." : "Analizar nota con IA"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Toggle WhatsApp removed as requested - Alerts are internal only */}

                  {/* Botón de Confirmación Principal */}
                  {(() => {
                    const hasAbonoVal = !!montoAbono && parseFloat(montoAbono) > 0;
                    const valProdFloat = valorProducto ? parseFloat(valorProducto) : 0;
                    const abonoFloat = montoAbono ? parseFloat(montoAbono) : 0;

                    // Deshabilitar botón si intentan meter abono inválido
                    const isSubmitDisabled = loading || (hasAbonoVal && (valProdFloat <= 0 || abonoFloat > valProdFloat));

                    let btnText = "Guardar y Continuar";
                    let btnColor = "bg-blue-600 hover:bg-blue-500 text-white";

                    if (resultadoPaso2 === DemoReseñaEnum.INTERESADO || resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR) {
                      if (hasAbonoVal) {
                        btnText = `Confirmar Venta y Registrar Abono ($${abonoFloat.toFixed(2)})`;
                        btnColor = "bg-emerald-600 hover:bg-emerald-500 text-white";
                      } else if (resultadoPaso2 === DemoReseñaEnum.INTERESADO) {
                        btnText = "Confirmar Interés (Mover a Pagos)";
                        btnColor = "bg-blue-600 hover:bg-blue-500 text-white";
                      } else {
                        btnText = "Guardar y Reprogramar Seguimiento";
                        btnColor = "bg-amber-600 hover:bg-amber-500 text-zinc-950";
                      }
                    } else if (resultadoPaso2 === DemoReseñaEnum.NO_INTERESADO) {
                      btnText = "Confirmar y Cerrar Lead ❌";
                      btnColor = "bg-red-650 hover:bg-red-600 text-white";
                    }

                    return (
                      <button
                        onClick={() => handleRegistrarInteres(resultadoPaso2)}
                        disabled={isSubmitDisabled}
                        className={`w-full py-3 px-4 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 ${btnColor}`}
                      >
                        {resultadoPaso2 === DemoReseñaEnum.INTERESADO && <ThumbsUp size={16} />}
                        {resultadoPaso2 === DemoReseñaEnum.VOLVER_A_PRESENTAR && <RefreshCw size={16} />}
                        {resultadoPaso2 === DemoReseñaEnum.NO_INTERESADO && <ThumbsDown size={16} />}
                        {loading ? "Procesando..." : btnText}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ══════ PASO 3: Pago o Nota ══════ */}
          {pasoActual === 3 && (() => {
            const hasMontoTotal = cliente.montoTotal !== null && cliente.montoTotal !== undefined;
            const totalEsperado = hasMontoTotal ? parseFloat(cliente.montoTotal!.toString()) : 0;
            const totalAbonado = pagosList.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            const saldoPendiente = totalEsperado > 0 ? Math.max(0, totalEsperado - totalAbonado) : 0;

            return (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {hasMontoTotal ? "Paso 3 — Cierre de Cliente / Abonos" : "Paso 3 — Cierre de Lead"}
                </h3>

                {/* Resumen de abonos si existe montoTotal */}
                {hasMontoTotal && (
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Producto</span>
                        <span className="text-sm font-bold text-zinc-200 font-mono">${totalEsperado.toFixed(2)}</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Abonado</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">${totalAbonado.toFixed(2)}</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pendiente</span>
                        <span className="text-sm font-bold text-amber-500 font-mono">${saldoPendiente.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Lista de abonos anteriores si existen */}
                    {pagosList.length > 0 && (
                      <div className="pt-2 border-t border-zinc-900/80">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Historial de Abonos</span>
                        <div className="mt-1.5 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                          {pagosList.map((p, pIdx) => (
                            <div key={p.id || pIdx} className="flex flex-col gap-1 text-xs text-zinc-400 bg-zinc-900/40 px-2.5 py-2 rounded-lg border border-zinc-850/30">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-zinc-300 font-bold">${parseFloat(p.monto).toFixed(2)} ({p.metodo})</span>
                                <span className="text-[10px] text-zinc-500">
                                  {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short" }) : ""}
                                </span>
                              </div>
                              {p.notas && (
                                <p className="text-[10px] text-zinc-500 italic mt-0.5 border-t border-zinc-900/40 pt-1">
                                  📝 {p.notas}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
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
                    {hasMontoTotal ? "Registrar Abono" : "Registrar Pago"}
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
                        <label className="text-xs font-semibold text-zinc-400">
                          {hasMontoTotal ? "Monto a Abonar ($)" : "Monto de Venta ($)"}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            placeholder={hasMontoTotal ? saldoPendiente.toFixed(2) : "0.00"}
                            className="w-full pl-8 pr-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                          />
                        </div>
                        {hasMontoTotal && monto && parseFloat(monto) > saldoPendiente && (
                          <p className="text-[10px] font-semibold text-red-400 mt-1 animate-pulse">
                            ⚠️ El abono no puede superar el saldo pendiente de ${saldoPendiente.toFixed(2)}
                          </p>
                        )}
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
                          placeholder="Ej: Segundo abono o Pago de saldo restante"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
                        />
                      </div>

                      {/* Botón Pago */}
                      <button
                        onClick={handleRegistrarPago}
                        disabled={
                          loading || 
                          !monto || 
                          (hasMontoTotal && parseFloat(monto) > saldoPendiente)
                        }
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <DollarSign size={16} />
                        {loading ? "Procesando..." : hasMontoTotal && parseFloat(monto) >= saldoPendiente ? "Registrar Pago Final y Cierre" : "Registrar Abono"}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Solo registrar nota */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400">Nota de Cierre / Conclusión</label>
                        <div className="relative">
                          <textarea
                            value={notaPago}
                            onChange={(e) => setNotaPago(e.target.value)}
                            placeholder="Escribe los detalles o notas finales por las cuales se concluye este lead..."
                            rows={4}
                            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none"
                          />
                          <div className="absolute bottom-3 right-3">
                            <MicrophoneButton
                              onTranscript={(text) => setNotaPago(prev => prev + (prev ? " " : "") + text)}
                              disabled={loading}
                            />
                          </div>
                        </div>
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
                      ? "El abono/pago se registrará directamente en el módulo de Finanzas."
                      : "Esta nota se guardará en el historial y marcará el lead como concluido sin movimientos financieros."}
                  </p>
                </div>
              </div>
            );
          })()}


          {/* ══════ ESTADO FINAL: cliente ══════ */}
          {pasoActual === 4 && (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-emerald-400">Cliente Convertido</h3>
                {cliente.montoTotal && (
                  <p className="text-2xl font-bold text-zinc-100">${Number(cliente.montoTotal).toFixed(2)}</p>
                )}
                {cliente.fechaCompra && (
                  <p className="text-xs text-zinc-500">
                    Pagado el{" "}
                    {new Date(cliente.fechaCompra).toLocaleDateString("es-EC", {
                      timeZone: "America/Guayaquil",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              {/* Agregar nota adicional para clientes completados */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Agregar Nota Adicional
                </h3>
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 space-y-3">
                  <div className="relative">
                    <textarea
                      value={notaAdicional}
                      onChange={(e) => setNotaAdicional(e.target.value)}
                      placeholder="Escribe una nota adicional sobre este cliente..."
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-650 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors resize-none"
                    />
                    <div className="absolute bottom-3 right-3">
                      <MicrophoneButton
                        onTranscript={(text) => setNotaAdicional(prev => prev + (prev ? " " : "") + text)}
                        disabled={loadingNotaAdicional}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAgregarNotaAdicional}
                    disabled={loadingNotaAdicional || !notaAdicional.trim()}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <FileText size={14} />
                    {loadingNotaAdicional ? "Agregando..." : "Agregar Nota"}
                  </button>
                </div>
              </div>
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
                  {new Date(cliente.fechaReseña).toLocaleDateString("es-EC", {
                    timeZone: "America/Guayaquil",
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
                    {new Date(cliente.fechaDemo).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short" })}
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
                    {new Date(cliente.fechaReseña).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short" })}
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
                    {new Date(cliente.fechaCompra).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
              {/* Seguimientos/Notas */}
              {seguimientosList.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare size={14} className="text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-300">Notas de Conversación</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {seguimientosList.map((seg) => (
                      <div 
                        key={seg.id} 
                        className="text-xs text-zinc-400 bg-zinc-900/40 px-3 py-2 rounded-lg border border-zinc-850/30 cursor-pointer hover:bg-zinc-900/60 transition-colors"
                        onClick={() => setExpandedNoteId(expandedNoteId === seg.id ? null : seg.id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(seg.fechaProg).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          {seg.estado && (
                            <span className={`text-[10px] px-2 py-0.5 rounded ${
                              seg.estado === "PENDIENTE" ? "bg-amber-500/10 text-amber-400" :
                              seg.estado === "ENVIADO" ? "bg-emerald-500/10 text-emerald-400" :
                              "bg-zinc-700 text-zinc-400"
                            }`}>
                              {seg.estado}
                            </span>
                          )}
                        </div>
                        <p className={`text-zinc-300 ${expandedNoteId === seg.id ? "" : "line-clamp-2"}`}>
                          {seg.mensaje}
                        </p>
                        {expandedNoteId === seg.id && (
                          <div className="mt-2 pt-2 border-t border-zinc-850/50">
                            <p className="text-[10px] text-zinc-500">
                              Fecha programada: {new Date(seg.fechaProg).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de Confirmación: Eliminar Cliente ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 bg-zinc-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">¿Eliminar cliente?</h3>
                <p className="text-sm text-zinc-400">
                  Se eliminará <span className="font-semibold text-zinc-200">{cliente.nombre}</span> y{" "}
                  <span className="text-red-400 font-bold">todos sus datos</span>: pagos, finanzas, notas y seguimientos.
                </p>
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider pt-1">Esta acción es irreversible.</p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loadingDelete}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer border border-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCliente}
                  disabled={loadingDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {loadingDelete ? "Eliminando..." : "Eliminar todo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
