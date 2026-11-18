import { desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { notices } from "@/db/settings-schema";
import { getCurrentAdmin } from "@/lib/auth";
import { deleteNoticeAction } from "../branding-actions";
import { NoticeForm } from "./notice-form";

const SEVERITY_LABELS = {
  info: "Informação",
  warning: "Atenção",
  critical: "Urgente",
} as const;

const STATUS_LABELS = {
  active: { text: "Ativo agora", className: "bg-emerald-900 text-emerald-200" },
  scheduled: { text: "Agendado", className: "bg-sky-900 text-sky-200" },
  ended: { text: "Encerrado", className: "bg-slate-700 text-slate-300" },
} as const;

// "2026-11-20" -> "20/11/2026"
const brDate = (value: string) => value.split("-").reverse().join("/");

async function Gate() {
  if (!(await getCurrentAdmin())) redirect("/admin/login");

  const today = sql`(now() at time zone 'America/Sao_Paulo')::date`;

  const rows = await db
    .select({
      id: notices.id,
      message: notices.message,
      severity: notices.severity,
      startsOn: notices.startsOn,
      endsOn: notices.endsOn,
      createdBy: notices.createdBy,
      status: sql<"active" | "scheduled" | "ended">`case
        when ${notices.endsOn} < ${today} then 'ended'
        when ${notices.startsOn} > ${today} then 'scheduled'
        else 'active' end`,
    })
    .from(notices)
    .orderBy(desc(notices.startsOn), desc(notices.id));

  return (
    <div className="mt-6 space-y-6">
      <NoticeForm />

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum aviso cadastrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-slate-800 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded px-2 py-0.5 font-semibold ${STATUS_LABELS[row.status].className}`}>
                  {STATUS_LABELS[row.status].text}
                </span>
                <span className="text-slate-400">{SEVERITY_LABELS[row.severity]}</span>
                <span className="text-slate-400">
                  {brDate(row.startsOn)} a {brDate(row.endsOn)}
                </span>
              </div>

              <p className="mt-2 text-sm">{row.message}</p>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{row.createdBy ? `Criado por ${row.createdBy}` : ""}</span>
                <form action={deleteNoticeAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white">
                    Excluir
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NoticesPage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8 sm:pb-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Avisos de serviço</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aparecem como faixa no topo do app durante o período, e somem sozinhos
          depois.
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