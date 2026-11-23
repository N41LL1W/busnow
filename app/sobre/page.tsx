import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Sobre" };

export default async function AboutPage() {
  const settings = await getSettings();

  // O texto "Sobre" do painel: cada bloco separado por linha em branco vira um parágrafo
  const paragraphs = settings.aboutText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const contacts: { label: string; content: React.ReactNode }[] = [];

  if (settings.contactPhone) {
    contacts.push({
      label: "Telefone",
      content: (
        <a
          href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
          className="font-medium text-brand-ink underline"
        >
          {settings.contactPhone}
        </a>
      ),
    });
  }
  if (settings.contactEmail) {
    contacts.push({
      label: "E-mail",
      content: (
        <a
          href={`mailto:${settings.contactEmail}`}
          className="font-medium text-brand-ink underline"
        >
          {settings.contactEmail}
        </a>
      ),
    });
  }
  if (settings.contactSite) {
    contacts.push({
      label: "Site",
      content: (
        <a
          href={settings.contactSite}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-ink underline"
        >
          {settings.contactSite}
        </a>
      ),
    });
  }
  if (settings.contactHours) {
    contacts.push({ label: "Atendimento", content: settings.contactHours });
  }
  if (settings.contactAddress) {
    contacts.push({ label: "Endereço", content: settings.contactAddress });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">Sobre o serviço</h1>

        <div className="mt-4 space-y-3 leading-relaxed">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))
          ) : (
            <p>
              Acompanhe os horários e a posição dos ônibus em tempo real,
              direto no celular.
            </p>
          )}
        </div>

        {contacts.length > 0 && (
          <section className="mt-8 rounded-2xl border border-line bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">Contato</h2>
            <dl className="space-y-3 text-sm">
              {contacts.map((contact) => (
                <div key={contact.label} className="flex flex-wrap gap-x-3">
                  <dt className="w-28 shrink-0 text-muted">{contact.label}</dt>
                  <dd className="min-w-0 wrap-break-word">{contact.content}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </AppShell>
  );
}