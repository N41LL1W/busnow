"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNoticeAction } from "../branding-actions";
import type { FormState } from "../form-state";

const inputClass = "mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white";

export function NoticeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createNoticeAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Depois de salvar, limpa o formulário para o próximo aviso
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-lg bg-slate-800 p-5"
    >
      <h2 className="font-semibold">Novo aviso</h2>

      <label className="block text-sm text-slate-300">
        Mensagem (até 200 caracteres)
        <textarea
          name="message"
          required
          maxLength={200}
          rows={2}
          placeholder="Ex.: Sem circulação no feriado de 20/11."
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm text-slate-300">
          Tipo
          <select name="severity" defaultValue="info" className={inputClass}>
            <option value="info">Informação</option>
            <option value="warning">Atenção</option>
            <option value="critical">Urgente</option>
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Começa em
          <input type="date" name="startsOn" required className={inputClass} />
        </label>
        <label className="block text-sm text-slate-300">
          Termina em
          <input type="date" name="endsOn" required className={inputClass} />
        </label>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Aviso criado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-5 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Criar aviso"}
      </button>
    </form>
  );
}