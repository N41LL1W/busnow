"use client";

import { useActionState, useState } from "react";
import type { Settings } from "@/lib/settings";
import { removeLogoAction, saveAppearanceAction } from "../branding-actions";
import type { FormState } from "../form-state";

// Texto claro ou escuro, o que ficar legível sobre a cor escolhida.
// (A mesma conta de lib/settings.ts; aqui é cópia porque aquele arquivo
// acessa o banco e não pode ir para o navegador.)
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0f172a" : "#ffffff";
}

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";

export function AppearanceForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveAppearanceAction,
    null
  );
  const [serviceName, setServiceName] = useState(settings.serviceName);
  const [cityName, setCityName] = useState(settings.cityName);
  const [color, setColor] = useState(settings.primaryColor);

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Prévia" className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
        <div className="flex items-center gap-3 px-4 py-3">
          {settings.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/logo?v=${settings.logoVersion}`}
              alt=""
              className="h-10 w-auto max-w-40 object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
              style={{ backgroundColor: color, color: contrastColor(color) }}
            >
              {(serviceName || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="leading-tight">
            <span className="block font-bold">{serviceName || "Nome do serviço"}</span>
            <span className="block text-xs text-slate-400">{cityName || "Cidade"}</span>
          </span>
        </div>
        <div className="h-1" style={{ backgroundColor: color }} />
      </section>

      {settings.hasLogo && (
        <form action={removeLogoAction} className="flex items-center justify-between rounded-lg bg-slate-800 p-4 text-sm">
          <span className="text-slate-300">Há um logotipo salvo.</span>
          <button type="submit" className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold">
            Remover logotipo
          </button>
        </form>
      )}

      <form action={action} className="space-y-4 rounded-lg bg-slate-800 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            Nome do serviço
            <input
              name="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
              maxLength={40}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Cidade
            <input
              name="cityName"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
              maxLength={60}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex items-center gap-4">
          <label className="block text-sm text-slate-300">
            Cor principal
            <input
              type="color"
              name="primaryColor"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block h-10 w-20 cursor-pointer rounded bg-slate-900"
            />
          </label>
          <span className="mt-6 text-sm text-slate-400">{color}</span>
        </div>

        <label className="block text-sm text-slate-300">
          Logotipo ou brasão (PNG, JPG ou WebP, até 300 KB)
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            Telefone da Secretaria
            <input
              type="tel"
              name="phone"
              defaultValue={settings.phone ?? ""}
              maxLength={30}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-slate-300">
            E-mail
            <input
              type="email"
              name="email"
              defaultValue={settings.email ?? ""}
              maxLength={120}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block text-sm text-slate-300">
          Site da Prefeitura
          <input
            type="url"
            name="website"
            defaultValue={settings.website ?? ""}
            maxLength={200}
            placeholder="https://"
            className={inputClass}
          />
        </label>

        <label className="block text-sm text-slate-300">
          Texto sobre o serviço (até 1500 caracteres)
          <textarea
            name="about"
            defaultValue={settings.about ?? ""}
            maxLength={1500}
            rows={5}
            className={inputClass}
          />
        </label>

        {state?.error && (
          <p role="alert" className="text-sm text-red-400">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p role="status" className="text-sm text-emerald-400">
            Salvo. As mudanças já aparecem no app.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-5 py-2 font-semibold disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}