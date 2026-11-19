import Link from "next/link";
import { getSettings } from "@/lib/settings";

export async function SiteHeader() {
  const settings = await getSettings();
  const place = [settings.cityName, settings.stateCode]
    .filter(Boolean)
    .join(" - ");
  const subtitle = settings.tagline || place;

  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        {settings.hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/logo?v=${settings.logoVersion}`}
            alt={`Logotipo de ${settings.serviceName}`}
            className="h-10 w-auto max-w-32 object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl"
          >
            🚌
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-xl font-bold leading-tight">
            {settings.serviceName}
          </span>
          {subtitle && (
            <span className="block truncate text-xs text-slate-400">
              {subtitle}
            </span>
          )}
        </span>
      </Link>

      <nav className="flex gap-1 text-sm">
        <Link href="/" className="rounded px-3 py-2 hover:bg-slate-800">
          Mapa
        </Link>
        <Link href="/horarios" className="rounded px-3 py-2 hover:bg-slate-800">
          Horários
        </Link>
        <Link href="/sobre" className="rounded px-3 py-2 hover:bg-slate-800">
          Sobre
        </Link>
      </nav>
    </header>
  );
}