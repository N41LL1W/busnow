"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "../form-state";
import {
  createHolidayAction,
  deleteHolidayAction,
  importNationalAction,
} from "./actions";

export type HolidayRow = {
  id: number;
  date: string;
  name: string;
  treatAs: "weekday" | "saturday" | "sunday";
  past: boolean;
};

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";

const TREAT_LABELS = {
  weekday: "horários de dia útil",
  saturday: "horários de sábado",
  sunday: "horários de domingo",
} as const;

// "2026-11-20" -> "20/11/2026"
const brDate = (value: string) => value.split("-").reverse().join("/");

function ImportForm({ years }: { years: number[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    importNationalAction,
    null
  );

  return (
    <form action={action} className="space-y-3 rounded-lg bg-slate-800 p-5">
      <h2 className="font-semibold">Feriados nacionais</h2>
      <p className="text-sm text-slate-400">
        Cadastra de uma vez Ano Novo, Carnaval, Sexta-feira Santa, Tiradentes,
        Corpus Christi e os demais. Datas já cadastradas não são alteradas.
      </p>
      <div className="flex items-end gap-3">
        <label className="text-sm text-slate-300">
          Ano
          <select name="year" defaultValue={years[0]} className={inputClass}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Cadastrando..." : "Cadastrar"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-amber-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Feriados cadastrados.
        </p>
      )}
    </form>
  );
}

function NewHolidayForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createHolidayAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-lg bg-slate-800 p-5"
    >
      <h2 className="font-semibold">Novo feriado ou ponto facultativo</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm text-slate-300">
          Data
          <input type="date" name="date" required className={inputClass} />
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Nome
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: Aniversário da cidade"
            className={inputClass}
          />
        </label>
      </div>
      <label className="block text-sm text-slate-300">
        Nesse dia valem os horários de
        <select name="treatAs" defaultValue="sunday" className={inputClass}>
          <option value="sunday">Domingo (o mais comum)</option>
          <option value="saturday">Sábado</option>
        </select>
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Feriado cadastrado.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Cadastrar feriado"}
      </button>
    </form>
  );
}

export function HolidayManager({
  rows,
  years,
}: {
  rows: HolidayRow[];
  years: number[];
}) {
  return (
    <div className="mt-6 space-y-6">
      <ImportForm years={years} />
      <NewHolidayForm />

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum feriado cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 ${
                row.past ? "opacity-50" : ""
              }`}
            >
              <span className="w-24 shrink-0 text-sm tabular-nums text-slate-300">
                {brDate(row.date)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{row.name}</span>
                <span className="block text-xs text-slate-400">
                  {TREAT_LABELS[row.treatAs]}
                </span>
              </span>
              <form action={deleteHolidayAction}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  aria-label={`Excluir ${row.name}`}
                  className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Excluir
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}