"use client";

import { useEffect, useState } from "react";

// O TypeScript não conhece este evento (é do Chrome), então descrevemos aqui
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Se já está instalado e aberto como app, não mostra nada
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    function onBeforeInstall(event: Event) {
      event.preventDefault(); // impede o aviso automático; usaremos o nosso botão
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone/iPad: não existe o evento, então mostramos a instrução
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const timer = window.setTimeout(() => setShowIosHint(isIos), 0);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (dismissed || (!installEvent && !showIosHint)) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
      {installEvent ? (
        <>
          <span>Instale o app na tela inicial: abre mais rápido e funciona como um aplicativo.</span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setDismissed(true)}
              className="min-h-11 rounded-lg px-3 text-muted"
            >
              Agora não
            </button>
            <button
              onClick={install}
              className="min-h-11 rounded-lg bg-brand px-4 font-semibold text-white"
            >
              Instalar
            </button>
          </div>
        </>
      ) : (
        <>
          <span>
            Para instalar: toque em <strong>Compartilhar</strong> e depois em{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="min-h-11 shrink-0 rounded-lg px-3 text-muted"
          >
            Fechar
          </button>
        </>
      )}
    </div>
  );
}