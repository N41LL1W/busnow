import { getSettings } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSettings();
  const place = [settings.cityName, settings.stateCode]
    .filter(Boolean)
    .join(" - ");

  return (
    <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-400">
      <p>
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

      {settings.showPoweredBy && <p className="mt-1">Tecnologia BusNow</p>}
    </footer>
  );
}