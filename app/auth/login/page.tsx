"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Credenciales incorrectas. Intenta de nuevo.");
        setLoading(false);
      } else {
        router.refresh();
        router.push("/clientes"); // redirigir a clientes como vista inicial
      }
    } catch (err) {
      setError("Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,#18181b,transparent)] pointer-events-none" />

      {/* Double-bezel outer card */}
      <div className="w-full max-w-md p-1 bg-zinc-900/40 border border-zinc-800/80 rounded-[2rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl relative z-10">
        {/* Inner core container */}
        <div className="bg-zinc-950/80 border border-zinc-900/60 rounded-[calc(2rem-4px)] p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            {/* Logo placeholder icon */}
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <span className="text-zinc-400 font-mono font-bold text-xl">AG</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tighter text-zinc-100">
              AntiGravity CRM
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Ingresa al panel administrativo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-zinc-400 block"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@antigravity.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-400 block"
              >
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-3 px-4 text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Acceder al CRM"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
