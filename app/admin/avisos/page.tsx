import { desc, sql } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { notices } from "@/db/settings-schema";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteNoticeAction, toggleNoticeAction } from "./actions";
import { NoticeForm } from "./notice-form";

const SEVERITY_LABELS = {
  info: "Informação",
  warning: "Atenção",
  critical: "Urgente",
} as const;

const STATUS = {
  live: { text: "No ar agora", className: "bg-emerald-900 text-emerald-200" },
  scheduled: { text: "Agendado", className: "bg-sky-900 text-sky-200" },
  ended: { text: "Encerrado", className: "bg-slate-700 text-slate-300" },
  off: { text: "Desativado", className: "bg-slate-700 text-slate-300" },
} as const;

const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

async function Gate() {
  await requireAdmin();
  // O banco diz se o aviso está no ar (usa o relógio dele, sem depender do app)
  const rows = await db
    .select({
      id: notices.id,
      message: notices.message,
      severity: notices.severity,
      startsAt: notices.startsAt,
      endsAt: notices.endsAt,
      active: notices.active,
      status: sql<"live" | "scheduled" | "ended" | "off">`case
        when not ${notices.active} then 'off'
        when ${notices.startsAt} > now() then 'scheduled'
        when ${notices.endsAt} is not null and ${notices.endsAt} <= now() then 'ended'
        else 'live' end`,
    })
    .from(notices)
    .orderBy(desc(notices.startsAt));

  return (
    <div className="mt-6 space-y-6">
      <NoticeForm />

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum aviso cadastrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const status = row.status;

            return (
              <li key={row.id} className="rounded-lg bg-slate-800 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 font-semibold ${STATUS[status].className}`}
                  >
                    {STATUS[status].text}
                  </span>
                  <span className="text-slate-400">
                    {SEVERITY_LABELS[row.severity]}
                  </span>
                  <span className="text-slate-400">
                    {formatter.format(row.startsAt)}
                    {row.endsAt ? ` até ${formatter.format(row.endsAt)}` : " (sem término)"}
                  </span>
                </div>

                <p className="mt-2 text-sm">{row.message}</p>

                <div className="mt-3 flex justify-end gap-2 text-xs">
                  <form action={toggleNoticeAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded bg-slate-600 px-3 py-1.5 font-semibold text-white"
                    >
                      {row.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action={deleteNoticeAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function NoticesPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Avisos de serviço</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aparecem como faixa no topo do app durante o período.
        </p>
        <Suspense
          fallback={<div className="mt-6 h-72 animate-pulse rounded-lg bg-slate-800" />}
        >
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}