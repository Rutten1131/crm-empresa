"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Bot,
} from "lucide-react";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const userName = user.name || "Usuario";
  const userRole = user.role || "AGENTE";

  const menuItems = [
    {
      name: "Clientes",
      href: "/clientes",
      icon: Users,
    },
    {
      name: "Finanzas",
      href: "/finanzas",
      icon: DollarSign,
    },
    {
      name: "Avisos WhatsApp",
      href: "/avisos",
      icon: MessageSquare,
    },
  ];

  // Solo mostrar configuración si es ADMIN
  if (userRole === "ADMIN") {
    menuItems.push({
      name: "CHAT",
      href: "/chat",
      icon: Bot,
    });
  }

  return (
    <>
      {/* Barra superior para móviles */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between px-6 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <span className="text-zinc-300 font-mono font-bold text-sm">AG</span>
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 block">
              AntiGravity
            </span>
            <span className="text-[9px] font-medium text-emerald-500 tracking-wider uppercase block">
              CRM Engine
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer active:scale-95"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Backdrop de fondo oscuro para móviles */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* Menú lateral deslizable para móviles (Drawer) */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between h-screen transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Header del drawer */}
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <span className="text-zinc-300 font-mono font-bold text-sm">AG</span>
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-zinc-100 block">
                  AntiGravity
                </span>
                <span className="text-[10px] font-medium text-emerald-500 tracking-wider uppercase block">
                  CRM Engine
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Enlaces de navegación móviles */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group duration-200 ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800/80 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-zinc-200" : "text-zinc-500 group-hover:text-zinc-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Info usuario y botón salir (móvil) */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <div className="flex items-center gap-3 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded-2xl mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <UserIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate leading-none mb-1">
                {userName}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 leading-none">
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-900 hover:border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Sidebar fijo para computadoras (Desktop) */}
      <aside className="hidden md:flex w-64 bg-zinc-950 border-r border-zinc-900 flex-col justify-between h-screen sticky top-0">
        <div>
          <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <span className="text-zinc-300 font-mono font-bold text-sm">AG</span>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100 block">
                AntiGravity
              </span>
              <span className="text-[10px] font-medium text-emerald-500 tracking-wider uppercase block">
                CRM Engine
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group duration-200 ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800/80 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-zinc-200" : "text-zinc-500 group-hover:text-zinc-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <div className="flex items-center gap-3 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded-2xl mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <UserIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate leading-none mb-1">
                {userName}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 leading-none">
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-900 hover:border-zinc-800/80 bg-zinc-950 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}

