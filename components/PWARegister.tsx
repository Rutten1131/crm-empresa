"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registrado con éxito. Scope:", reg.scope);
          })
          .catch((err) => {
            console.error("Fallo al registrar el Service Worker:", err);
          });
      };

      // Si la ventana ya se cargó, registrar inmediatamente
      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad);
        return () => window.removeEventListener("load", handleLoad);
      }
    }
  }, []);

  return null;
}
