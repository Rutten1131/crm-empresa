export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">
          Configuración
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Ajustes globales del sistema, plantillas de WhatsApp y gestión de usuarios.
        </p>
      </div>

      <div className="p-8 bg-zinc-900/30 border border-zinc-900 rounded-3xl flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
          <span className="font-mono text-sm">CFG</span>
        </div>
        <h3 className="text-lg font-medium text-zinc-300">
          Módulo de Configuración en Desarrollo
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mt-2">
          Este módulo se implementará detalladamente en el Módulo 6.
        </p>
      </div>
    </div>
  );
}
