"use client";

import { useSyncExternalStore } from "react";

// "Meu ponto": a parada favorita do passageiro, guardada no próprio celular
// (localStorage). Nada vai para o servidor: não há conta nem dado pessoal.
const KEY = "busnow:my-stop";
const EVENT = "busnow:my-stop-changed";

function read(): number | null {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    // modo privado ou armazenamento bloqueado: o app funciona sem salvar
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // outra aba mudou
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Pode ser chamada de qualquer lugar (inclusive de dentro do mapa)
export function setMyStop(stopId: number | null): void {
  try {
    if (stopId === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(stopId));
  } catch {
    // sem armazenamento: ignora
  }
  window.dispatchEvent(new Event(EVENT));
}

// No servidor (e na primeira pintura) devolve null; depois o valor salvo.
export function useMyStop(): number | null {
  return useSyncExternalStore(subscribe, read, () => null);
}