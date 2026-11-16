"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Só em produção: em desenvolvimento o cache atrapalharia, porque
    // você ficaria vendo arquivos antigos depois de editar o código.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar o service worker:", error);
    });
  }, []);

  return null; // não desenha nada na tela
}