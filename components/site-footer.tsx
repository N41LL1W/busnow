import Link from "next/link";
import { getSettings } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSettings();
  const place = [settings.cityName, settings.stateCode]
    .filter(Boolean)
    .join(" - ");

  return (
    <footer className="mx-auto mt-10 max-w-7xl border-t border-line px-4 pb-28 pt-6 text-xs text-muted sm:px-6 md:pb-8">
      <p className="font-semibold text-ink">
        {settings.serviceName}
        {place ? ` · ${place}` : ""}
      </p>

      {(settings.contactPhone || settings.contactEmail) && (
        <p className="mt-1">
          {settings.contactPhone && (
            <a
              href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
              className="underline"
            >
              {settings.contactPhone}
            </a>
          )}
          {settings.contactPhone && settings.contactEmail && " · "}
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="underline">
              {settings.contactEmail}
            </a>
          )}
        </p>
      )}

      <p className="mt-1">
        <Link href="/termos" className="underline">
          Termos de uso
        </Link>
        {" · "}
        <Link href="/privacidade" className="underline">
          Privacidade
        </Link>
      </p>

      {settings.showPoweredBy && (
        <p className="mt-1">
          Tecnologia{" "}
          <Link href="/prefeituras" className="underline">
            BusNow
          </Link>
        </p>
      )}
    </footer>
  );
}