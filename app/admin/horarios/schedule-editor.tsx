"use client";

import { useActionState, useState } from "react";
import type { FormState } from "../form-state";
import { saveDeparturesAction, saveMinutesAction } from "./actions";

export type EditorLine = {
  id: number;
  code: string;
  name: string;
  color: string;
  tripMinutes: number | null;
  departures: { weekday: string[]; saturday: string[]; sunday: string[] };
  stops: { lineStopId: number; name: string; minute: number }[];
};

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";

const DAYS = [
  { key: "weekday", label: "Segunda a sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

function Status({ state }: { state: FormState }) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Salvo. Já está valendo no app.
        </p>
      )}
    </>
  );
}

// "06:00" + "19:00" + 30 -> "06:00\n06:30\n...\n19:00"
function generateTimes(from: string, to: string, every: number): string | null {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  if (!from || !to || !Number.isInteger(every) || every < 1) return null;

  const start = toMinutes(from);
  const end = toMinutes(to);
  if (end < start) return null;

  const list: string[] = [];
  for (let t = start; t <= end && list.length < 150; t += every) {
    list.push(
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
    );
  }
  return list.join("\n");
}

function DayField({
  label,
  name,
  initial,
}: {
  label: string;
  name: string;
  initial: string[];
}) {
  const [text, setText] = useState(initial.join("\n"));
  const [from, setFrom] = useState("06:00");
  const [to, setTo] = useState("18:00");
  const [every, setEvery] = useState("30");

  const count = text.split(/[\s,;]+/).filter(Boolean).length;

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <label className="block text-sm font-semibold text-slate-200">
        {label}{" "}
        <span className="font-normal text-slate-400">({count} saídas)</span>
        <textarea
          name={name}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={"06:00\n06:30\n07:00"}
          className={`${inputClass} font-mono`}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-end gap-2 text-xs text-slate-300">
        <label>
          De
          <input
            type="time"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 block rounded bg-slate-900 px-2 py-1.5 text-white"
          />
        </label>
        <label>
          Até
          <input
            type="time"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 block rounded bg-slate-900 px-2 py-1.5 text-white"
          />
        </label>
        <label>
          A cada (min)
          <input
            type="number"
            min={1}
            value={every}
            onChange={(event) => setEvery(event.target.value)}
            className="mt-1 block w-20 rounded bg-slate-900 px-2 py-1.5 text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const generated = generateTimes(from, to, Number(every));
            if (generated) setText(generated);
          }}
          className="rounded bg-slate-600 px-3 py-2 font-semibold text-white"
        >
          Preencher
        </button>
      </div>
    </div>
  );
}

function DeparturesForm({ line }: { line: EditorLine }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveDeparturesAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lineId" value={line.id} />
      <h2 className="text-lg font-semibold">Saídas do terminal</h2>
      <p className="text-sm text-slate-400">
        Um horário por linha (ou separados por vírgula), no formato 06:30. A
        ordem não importa: o sistema organiza.
      </p>

      {DAYS.map((day) => (
        <DayField
          key={day.key}
          label={day.label}
          name={day.key}
          initial={line.departures[day.key]}
        />
      ))}

      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar saídas"}
      </button>
    </form>
  );
}

function MinutesForm({ line }: { line: EditorLine }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveMinutesAction,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lineId" value={line.id} />
      <h2 className="text-lg font-semibold">Minutos de cada parada</h2>
      <p className="text-sm text-slate-400">
        Minutos depois da saída do terminal em que o ônibus passa em cada
        parada (como no PDF da Prefeitura). Precisam crescer de uma parada para
        a outra e ser menores que a duração da volta.
      </p>

      <label className="block text-sm text-slate-300">
        Duração da volta completa (min)
        <input
          type="number"
          name="tripMinutes"
          min={5}
          max={300}
          required
          defaultValue={line.tripMinutes ?? ""}
          className={`${inputClass} max-w-40`}
        />
      </label>

      <ol className="space-y-2">
        {line.stops.map((stop, index) => (
          <li
            key={stop.lineStopId}
            className="flex items-center gap-3 rounded-lg bg-slate-800 px-3 py-2"
          >
            <span className="w-6 text-right text-xs text-slate-500">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{stop.name}</span>
            {index === 0 ? (
              <span className="w-24 text-right text-sm text-slate-400">
                saída (0)
              </span>
            ) : (
              <input
                type="number"
                name={`m-${stop.lineStopId}`}
                min={1}
                required
                defaultValue={stop.minute}
                aria-label={`Minutos até ${stop.name}`}
                className="w-24 rounded bg-slate-900 px-3 py-2 text-right text-white"
              />
            )}
          </li>
        ))}
      </ol>

      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar minutos"}
      </button>
    </form>
  );
}

export function ScheduleEditor({ lines }: { lines: EditorLine[] }) {
  const [lineId, setLineId] = useState(lines[0]?.id);
  const line = lines.find((item) => item.id === lineId) ?? lines[0];

  if (!line) {
    return <p className="mt-6 text-slate-400">Nenhuma linha cadastrada.</p>;
  }

  return (
    <div className="mt-6 space-y-8">
      <div role="tablist" aria-label="Linha" className="flex flex-wrap gap-2">
        {lines.map((item) => {
          const selected = item.id === line.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setLineId(item.id)}
              className={`rounded px-4 py-2 text-sm font-semibold ${
                selected ? "text-white" : "bg-slate-800 text-slate-300"
              }`}
              style={selected ? { backgroundColor: item.color } : undefined}
            >
              {item.code} · {item.name}
            </button>
          );
        })}
      </div>

      {/* key: trocar de linha recria os formulários com os dados dela */}
      <DeparturesForm key={`d-${line.id}`} line={line} />
      <hr className="border-slate-700" />
      <MinutesForm key={`m-${line.id}`} line={line} />
    </div>
  );
}