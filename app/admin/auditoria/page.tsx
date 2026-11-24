import { desc, like } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { auditLog } from "@/db/audit-schema";
import { requireAdmin } from "@/lib/admin-guard";
import { AUDIT_AREAS, type AuditArea } from "@/lib/audit";

const PAGE_SIZE = 50;

const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "medium",
});

type SearchParams = Promise<{ area?: string; page?: string }>;

function href(area: string | null, page: number): string {
  const query = new URLSearchParams();
  if (area) query.set("area", area);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `/admin/auditoria?${text}` : "/admin/auditoria";
}

async function Gate({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const area =
    params.area && params.area in AUDIT_AREAS ? (params.area as AuditArea) : null;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  // Pedimos uma linha a mais só para saber se existe "próxima página"
  const rows = await db
    .select()
    .from(auditLog)
    .where(area ? like(auditLog.action, `${area}.%`) : undefined)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  return (
    <div className="mt-6 space-y-4">
      <nav aria-label="Filtrar por área" className="flex flex-wrap gap-2 text-sm">
        <Link
          href={href(null, 1)}
          className={`rounded px-3 py-1.5 ${
            area === null ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          Tudo
        </Link>
        {(Object.keys(AUDIT_AREAS) as AuditArea[]).map((key) => (
          <Link
            key={key}
            href={href(key, 1)}
            className={`rounded px-3 py-1.5 ${
              area === key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {AUDIT_AREAS[key]}
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum registro por aqui.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.id} className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-sm">{row.summary}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatter.format(row.createdAt)} · {row.adminName} ({row.adminEmail})
              </p>
              {row.details && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-slate-400">Detalhes</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-slate-300">
                    {JSON.stringify(row.details, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between text-sm">
        {page > 1 ? (
          <Link href={href(area, page - 1)} className="text-blue-300">
            ← Mais recentes
          </Link>
        ) : (
          <span />
        )}
        {hasNext && (
          <Link href={href(area, page + 1)} className="text-blue-300">
            Mais antigos →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Registro de atividades</h1>
        <p className="mt-1 text-sm text-slate-400">
          Quem mudou o quê no painel, e quando. Os registros só podem ser lidos:
          nem este painel os altera ou apaga.
        </p>
        <Suspense
          fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-slate-800" />}
        >
          <Gate searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}