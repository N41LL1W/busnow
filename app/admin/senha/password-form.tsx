"use client";

import { useActionState } from "react";
import { changePasswordAction } from "../actions";
import type { FormState } from "../form-state";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    changePasswordAction,
    null
  );

  return (
    <form action={action} className="w-full max-w-sm space-y-4 rounded-lg bg-slate-800 p-6">
      <h1 className="text-xl font-bold">Trocar senha</h1>

      <label className="block text-sm text-slate-300">
        Senha atual
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Nova senha (mínimo 10 caracteres)
        <input
          name="next"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Repita a nova senha
        <input
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Senha trocada. Os outros aparelhos conectados foram desconectados.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}