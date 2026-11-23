"use client";

import { setTheme, useTheme, type Theme } from "@/lib/theme";

// Ciclo: automático (sistema) → claro → escuro → automático
const NEXT: Record<string, Theme> = {
  auto: "light",
  light: "dark",
  dark: null,
};

const LABELS = {
  auto: "Tema automático (segue o sistema). Tocar para usar o tema claro.",
  light: "Tema claro. Tocar para usar o tema escuro.",
  dark: "Tema escuro. Tocar para voltar ao automático.",
} as const;

function Icon({ mode }: { mode: "auto" | "light" | "dark" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (mode === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useTheme();
  const mode = theme ?? "auto";

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[mode])}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-ink"
    >
      <Icon mode={mode} />
    </button>
  );
}