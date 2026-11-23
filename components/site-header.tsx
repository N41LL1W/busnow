import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { DesktopNav } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const settings = await getSettings();
  const place = [settings.cityName, settings.stateCode]
    .filter(Boolean)
    .join(" - ");
  const subtitle = place || settings.tagline;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {settings.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/logo?v=${settings.logoVersion}`}
              alt={`Logotipo de ${settings.serviceName}`}
              className="h-9 w-auto max-w-32 object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white"
            >
              {settings.serviceName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold">
              {settings.serviceName}
            </span>
            {subtitle && (
              <span className="block truncate text-xs text-muted">
                {subtitle}
              </span>
            )}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <DesktopNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}