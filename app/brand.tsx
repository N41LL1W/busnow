import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  contrastColor,
  getActiveNotices,
  getSettings,
  type ActiveNotice,
} from "@/lib/settings";

const NOTICE_STYLES: Record<ActiveNotice["severity"], string> = {
  info: "border-sky-700 bg-sky-950 text-sky-100",
  warning: "border-amber-700 bg-amber-950 text-amber-100",
  critical: "border-red-700 bg-red-950 text-red-100",
};

const NAV = [
  { href: "/", label: "Mapa" },
  { href: "/horarios", label: "Horários" },
  { href: "/sobre", label: "Sobre" },
];

export async function Branded({ children }: { children: ReactNode }) {
  const [settings, notices] = await Promise.all([
    getSettings(),
    getActiveNotices(),
  ]);

  // A cor principal vira variável de CSS: var(--brand) e var(--brand-contrast)
  const brandVars = {
    "--brand": settings.primaryColor,
    "--brand-contrast": contrastColor(settings.primaryColor),
  } as CSSProperties;

  const phoneLink = settings.phone?.replace(/[^\d+]/g, "");

  return (
    <div style={brandVars} className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            {settings.hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/logo?v=${settings.logoVersion}`}
                alt=""
                className="h-10 w-auto max-w-40 object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
                style={{
                  backgroundColor: "var(--brand)",
                  color: "var(--brand-contrast)",
                }}
              >
                {settings.serviceName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-base font-bold">{settings.serviceName}</span>
              <span className="block text-xs text-slate-400">{settings.cityName}</span>
            </span>
          </Link>

          <nav aria-label="Principal" className="flex gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-2 text-slate-200 hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="h-1" style={{ backgroundColor: "var(--brand)" }} />
      </header>

      {notices.map((notice) => (
        <div
          key={notice.id}
          role="status"
          className={`border-b px-4 py-3 text-center text-sm sm:px-8 ${NOTICE_STYLES[notice.severity]}`}
        >
          {notice.message}
        </div>
      ))}

      <div className="flex-1">{children}</div>

      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {settings.phone && phoneLink && (
              <a href={`tel:${phoneLink}`} className="hover:text-white">
                {settings.phone}
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="hover:text-white">
                {settings.email}
              </a>
            )}
            {settings.website && (
              <a
                href={settings.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Site da Prefeitura
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500">Tecnologia BusNow</p>
        </div>
      </footer>
    </div>
  );
}