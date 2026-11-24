"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "../form-state";
import {
  createLineAction,
  createVehicleAction,
  deleteLineAction,
  deleteVehicleAction,
  updateLineAction,
  updateVehicleAction,
} from "./actions";

type LineRow = {
  id: number;
  code: string;
  name: string;
  color: string;
  active: boolean;
  points: number;
  vehicles: number;
};

type VehicleRow = {
  id: number;
  externalId: string;
  label: string;
  lineId: number | null;
  active: boolean;
};

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";
const buttonClass =
  "rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

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
          Salvo.
        </p>
      )}
    </>
  );
}

function NewLineForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createLineAction,
    null
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4 rounded-lg bg-slate-800 p-5">
      <h3 className="font-semibold">Nova linha</h3>
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="block text-sm text-slate-300">
          Código
          <input
            name="code"
            required
            maxLength={10}
            placeholder="C3"
            className={`${inputClass} uppercase`}
          />
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Nome
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Circular 3"
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Cor
          <input
            type="color"
            name="color"
            defaultValue="#2563eb"
            className="mt-1 h-10 w-full rounded bg-slate-900"
          />
        </label>
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Criando..." : "Criar linha"}
      </button>
      <p className="text-xs text-slate-400">
        Depois de criar, desenhe o trajeto em <strong>Linhas</strong> e cadastre
        os horários em <strong>Horários</strong>.
      </p>
    </form>
  );
}

function LineCard({ line }: { line: LineRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateLineAction,
    null
  );
  const [delState, delAction, deleting] = useActionState<FormState, FormData>(
    deleteLineAction,
    null
  );

  return (
    <li className="space-y-3 rounded-lg bg-slate-800 p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={line.id} />
        <div className="flex items-center gap-3">
          <span
            className="rounded px-2 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: line.color }}
          >
            {line.code}
          </span>
          <span className="text-xs text-slate-400">
            {line.points} pontos no trajeto · {line.vehicles} veículo(s)
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-sm text-slate-300 sm:col-span-3">
            Nome
            <input
              name="name"
              defaultValue={line.name}
              required
              maxLength={60}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Cor
            <input
              type="color"
              name="color"
              defaultValue={line.color}
              className="mt-1 h-10 w-full rounded bg-slate-900"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="active" defaultChecked={line.active} />
          Linha ativa (aparece no app)
        </label>

        <Status state={state} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <details className="text-sm">
        <summary className="cursor-pointer text-red-300">Apagar esta linha</summary>
        <form action={delAction} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={line.id} />
          <p className="text-slate-300">
            Isso apaga o trajeto, as paradas e os horários desta linha. Os
            veículos ficam sem linha. Não dá para desfazer. Se for só tirar do
            app por um tempo, desmarque &quot;Linha ativa&quot; em vez de apagar.
          </p>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" name="confirm" />
            Entendi, quero apagar a linha {line.code}
          </label>
          {delState?.error && (
            <p role="alert" className="text-red-400">
              {delState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={deleting}
            className="rounded bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {deleting ? "Apagando..." : "Apagar linha"}
          </button>
        </form>
      </details>
    </li>
  );
}

function LineSelect({
  lines,
  defaultValue,
}: {
  lines: LineRow[];
  defaultValue: number | null;
}) {
  return (
    <select name="lineId" defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">Sem linha</option>
      {lines.map((line) => (
        <option key={line.id} value={line.id}>
          {line.code} · {line.name}
        </option>
      ))}
    </select>
  );
}

function NewVehicleForm({ lines }: { lines: LineRow[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createVehicleAction,
    null
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4 rounded-lg bg-slate-800 p-5">
      <h3 className="font-semibold">Novo veículo</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm text-slate-300">
          Identificador
          <input
            name="externalId"
            required
            maxLength={40}
            placeholder="BUS-03"
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Nome
          <input
            name="label"
            required
            maxLength={60}
            placeholder="Ônibus 3"
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Linha
          <LineSelect lines={lines} defaultValue={null} />
        </label>
      </div>
      <p className="text-xs text-slate-400">
        O identificador é o que liga o veículo ao sistema de rastreamento da
        empresa. Combine o valor exato com ela e não o mude depois.
      </p>
      <Status state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Criando..." : "Cadastrar veículo"}
      </button>
    </form>
  );
}

function VehicleCard({ vehicle, lines }: { vehicle: VehicleRow; lines: LineRow[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateVehicleAction,
    null
  );

  return (
    <li className="rounded-lg bg-slate-800 p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={vehicle.id} />
        <p className="text-xs text-slate-400">
          Identificador: <span className="font-mono">{vehicle.externalId}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            Nome
            <input
              name="label"
              defaultValue={vehicle.label}
              required
              maxLength={60}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Linha
            <LineSelect lines={lines} defaultValue={vehicle.lineId} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="active" defaultChecked={vehicle.active} />
          Em operação
        </label>
        <Status state={state} />
        <div className="flex items-center justify-between">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
      <form action={deleteVehicleAction} className="mt-2 text-right">
        <input type="hidden" name="id" value={vehicle.id} />
        <button type="submit" className="text-xs text-red-300 underline">
          Excluir veículo
        </button>
      </form>
    </li>
  );
}

export function CadastrosEditor({
  lines,
  vehicles,
}: {
  lines: LineRow[];
  vehicles: VehicleRow[];
}) {
  return (
    <div className="mt-6 space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Linhas</h2>
        <NewLineForm />
        {lines.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma linha cadastrada.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <LineCard key={line.id} line={line} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Veículos</h2>
        <NewVehicleForm lines={lines} />
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum veículo cadastrado.</p>
        ) : (
          <ul className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} lines={lines} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}