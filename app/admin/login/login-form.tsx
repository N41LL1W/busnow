"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import type { FormState } from "../form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginAction,
    null
  );

  return (
    <form action={action} className="w-full max-w-sm space-y-4 rounded-lg bg-slate-800 p-6">
      <h1 className="text-xl font-bold">Painel BusNow</h1>

      <label className="block text-sm text-slate-300">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Senha
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}