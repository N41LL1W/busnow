"use client";

import { useActionState, useEffect, useState } from "react";
import { contrastWithWhite, MIN_CONTRAST } from "@/lib/color";
import type { SiteSettings } from "@/lib/settings";
import type { FormState } from "../form-state";
import { saveSettingsAction } from "./actions";

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function AppearanceForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveSettingsAction,
    null
  );

  // Campos que aparecem na prévia
  const [serviceName, setServiceName] = useState(settings.serviceName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [color, setColor] = useState(settings.primaryColor);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Libera da memória a prévia do arquivo escolhido
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const savedLogo =
    settings.hasLogo && !removeLogo
      ? `/api/logo?v=${settings.logoVersion}`
      : null;
  const logoSrc = filePreview ?? savedLogo;

  const ratio = contrastWithWhite(color);
  const tooLight = ratio < MIN_CONTRAST;

  return (
    <form action={action} className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Aparência e informações</h1>

      {/* Prévia */}
      <section aria-label="Prévia" className="rounded-lg bg-slate-800 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
          Prévia do cabeçalho
        </p>
        <div className="rounded-lg bg-slate-900 p-4 ring-1 ring-slate-700">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-10 w-auto max-w-32 object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                style={{ backgroundColor: color }}
              >
                🚌
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-xl font-bold leading-tight">
                {serviceName || "Nome do serviço"}
              </p>
              <p className="truncate text-xs text-slate-400">{tagline}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span
              className="rounded px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              Horários
            </span>
            <span
              className="px-3 py-2 text-sm"
              style={{ color: `color-mix(in srgb, ${color} 55%, white)` }}
            >
              Link
            </span>
          </div>
        </div>
      </section>

      {/* Identidade */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Identidade</h2>

        <Field label="Nome do serviço">
          <input
            name="serviceName"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            maxLength={60}
            required
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Cidade">
              <input
                name="cityName"
                defaultValue={settings.cityName}
                maxLength={60}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="UF">
            <input
              name="stateCode"
              defaultValue={settings.stateCode}
              maxLength={2}
              className={`${inputClass} uppercase`}
            />
          </Field>
        </div>

        <Field label="Frase de apresentação" hint="Aparece embaixo do nome, no cabeçalho.">
          <input
            name="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </Field>

        <div>
          <p className="text-sm text-slate-300">Cor da marca</p>
          <div className="mt-1 flex items-center gap-3">
            <input
              name="primaryColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Cor da marca"
              className="h-10 w-16 cursor-pointer rounded bg-slate-900"
            />
            <span className="text-sm text-slate-400">{color}</span>
          </div>
          <p
            className={`mt-1 text-xs ${tooLight ? "text-red-400" : "text-slate-500"}`}
          >
            Contraste com texto branco: {ratio.toFixed(1).replace(".", ",")}
            {tooLight
              ? ` (muito clara; o mínimo é ${String(MIN_CONTRAST).replace(".", ",")}). Escolha uma cor mais escura.`
              : ". Boa para botões."}
          </p>
        </div>

        <div>
          <Field
            label="Logotipo"
            hint="PNG, JPEG ou WebP, até 300 KB. Fundo transparente fica melhor. Não aceitamos SVG."
          >
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFilePreview(file ? URL.createObjectURL(file) : null);
              }}
              className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
            />
          </Field>
          {settings.hasLogo && (
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="removeLogo"
                checked={removeLogo}
                onChange={(e) => setRemoveLogo(e.target.checked)}
              />
              Remover o logotipo atual
            </label>
          )}
        </div>
      </section>

      {/* Contato */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contato da Secretaria</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone">
            <input
              name="contactPhone"
              defaultValue={settings.contactPhone}
              maxLength={40}
              inputMode="tel"
              className={inputClass}
            />
          </Field>
          <Field label="E-mail">
            <input
              name="contactEmail"
              type="email"
              defaultValue={settings.contactEmail}
              maxLength={120}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Site" hint="Endereço completo, começando com https://">
          <input
            name="contactSite"
            defaultValue={settings.contactSite}
            maxLength={200}
            inputMode="url"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Horário de atendimento">
            <input
              name="contactHours"
              defaultValue={settings.contactHours}
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field label="Endereço">
            <input
              name="contactAddress"
              defaultValue={settings.contactAddress}
              maxLength={160}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* Sobre */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Página Sobre</h2>
        <Field
          label="Texto"
          hint="Deixe uma linha em branco para separar os parágrafos. Até 1000 caracteres."
        >
          <textarea
            name="aboutText"
            defaultValue={settings.aboutText}
            maxLength={1000}
            rows={6}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="showPoweredBy"
            defaultChecked={settings.showPoweredBy}
          />
          Mostrar Tecnologia BusNow no rodapé
        </label>
      </section>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Salvo. O app já mostra as mudanças.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}